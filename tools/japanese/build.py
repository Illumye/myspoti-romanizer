"""Builds the Japanese engine's model (src/engines/japanese/data/model.generated.ts) from the corpus
statistics (stats.py) and the lyrics corrections (corrections.tsv): the words seen most, within a
size budget, each with its reading, class and cost, and the cost of a class following another.

Costs are negative log probabilities in hundredths of a nat: a word given its class, a class given
the one before it. The extension finds the cheapest reading of a run with them (Viterbi).

Usage: build.py STATS.json.gz OUT.ts [--budget BYTES] [--classes N] [--min-count N]
"""

import argparse
import collections
import gzip
import json
import math
from pathlib import Path

from common import backoff, hepburn_reading
from corrections import apply_corrections
from encode import BASE, DIGITS, number, reading_code, surface_code, write_model

TRANSITION_STEP = 20  # one transition digit is 0.2 nat: 20 hundredths
COST_STEP = 20  # and so is one cost digit: the same precision for words and transitions
SMOOTHING = 0.1
MAX_SURFACE = 8
UNKNOWN_CLASS = "名詞|普通名詞|一般"
CORRECTIONS = Path(__file__).with_name("corrections.tsv")


def flags_of(key: str) -> int:
    """What the extension needs to know of a class to space and capitalize the words it holds."""
    parts = key.split("|")
    pos1, pos2 = parts[0], parts[1] if len(parts) > 1 else "*"
    return (
        (1 if pos1 == "接頭辞" else 0)
        | (2 if pos1 == "接尾辞" else 0)
        | (4 if pos1 == "助詞" and pos2 == "接続助詞" else 0)
        | (8 if pos1 in ("動詞", "助動詞", "形容詞") else 0)
        | (16 if pos1 == "助動詞" else 0)
        | (32 if key.startswith("助動詞|助動詞-デス") else 0)
        | (64 if pos1 == "名詞" and pos2 == "固有名詞" else 0)
        | (128 if pos1 == "名詞" and pos2 == "数詞" else 0)
        | (256 if key == "名詞|普通名詞|助数詞可能" else 0)
    )


def merge(stats: dict, lyrics: dict, weight: float) -> None:
    """[lyrics] added to [stats], each of their counts worth [weight]: a corpus of lyrics is small
    next to the subtitles, but it is the kind of text the extension reads."""
    entries = {(s, p, c): [n, origin] for s, p, c, n, origin in stats["entries"]}
    for s, p, c, n, origin in lyrics["entries"]:
        entries.setdefault((s, p, c), [0, origin])[0] += n * weight
    stats["entries"] = [[s, p, c, n, origin] for (s, p, c), (n, origin) in entries.items()]
    for key, n in lyrics["classes"].items():
        stats["classes"][key] = stats["classes"].get(key, 0) + n * weight
    transitions = collections.Counter({(a, b): n for a, b, n in stats["transitions"]})
    for a, b, n in lyrics["transitions"]:
        transitions[a, b] += n * weight
    stats["transitions"] = [[a, b, n] for (a, b), n in transitions.items()]
    for key, n in lyrics["unknown"].items():
        stats["unknown"][key] = stats["unknown"].get(key, 0) + n * weight


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("stats")
    parser.add_argument("out")
    parser.add_argument("--budget", type=int, default=800 * 1024)
    parser.add_argument("--classes", type=int, default=160)
    parser.add_argument("--min-count", type=int, default=3)
    parser.add_argument("--lyrics", help="statistics of lyrics (stats.py), the words of songs subtitles lack")
    parser.add_argument("--lyrics-weight", type=float, default=20.0, help="how many subtitle lines a lyric line counts for")
    args = parser.parse_args()

    with gzip.open(args.stats, "rt", encoding="utf-8") as f:
        stats = json.load(f)
    if args.lyrics:
        with gzip.open(args.lyrics, "rt", encoding="utf-8") as f:
            merge(stats, json.load(f), args.lyrics_weight)

    # Classes: the most frequent as they are, the rest folded into their part of speech.
    seen = collections.Counter(stats["classes"])
    kept = {k for k, _ in seen.most_common(args.classes)} | {backoff(k) for k in seen} | {UNKNOWN_CLASS}
    names = ["BOS/EOS"] + sorted(kept)
    index = {name: i for i, name in enumerate(names)}

    def cls(key: str) -> int | None:
        if key in ("BOS", "EOS"):
            return 0
        return index.get(key, index.get(backoff(key)))

    class_total: collections.Counter = collections.Counter()
    for key, n in seen.items():
        class_total[cls(key)] += n

    transitions: collections.Counter = collections.Counter()
    for a, b, n in stats["transitions"]:
        transitions[cls(a), cls(b)] += n
    leaving: collections.Counter = collections.Counter()
    for (a, _), n in transitions.items():
        leaving[a] += n
    size = len(names)

    def transition_digit(a: int, b: int) -> str:
        p = (transitions[a, b] + SMOOTHING) / (leaving[a] + SMOOTHING * size)
        return DIGITS[min(BASE - 1, round(-math.log(p) * 100 / TRANSITION_STEP))]

    matrix = "".join(transition_digit(a, b) for a in range(size) for b in range(size))

    # Words: the corrections applied, the forms seen most first, within the budget.
    entries = {(s, p, c): [n, origin] for s, p, c, n, origin in stats["entries"] if len(s) <= MAX_SURFACE}
    corrected = apply_corrections(str(CORRECTIONS), entries)
    records, used = [], 0
    for (surface, pron, key), (count, origin) in sorted(entries.items(), key=lambda kv: -kv[1][0]):
        if count < args.min_count:
            break
        c = cls(key)
        reading = reading_code(hepburn_reading(pron, origin))
        if c is None or not class_total[c] or reading is None or any(ord(ch) > 0xFFFF for ch in surface):
            continue
        cost = min(BASE - 1, round(-math.log(min(1.0, count / class_total[c])) * 100 / COST_STEP))
        coded = surface_code(surface)
        record = f"{coded},{reading}{number(c, 2)}{number(cost, 1)}|"
        if used + len(record.encode("utf-8")) > args.budget:
            break
        records.append((coded, record))
        used += len(record.encode("utf-8"))
    records.sort(key=lambda r: r[0].encode("utf-16-be"))
    lexicon = "".join(record for _, record in records)

    # Where the words of each first character start, so a search stays within their block.
    index_chars, index_starts, offset = [], [], 0
    for coded, record in records:
        if not index_chars or index_chars[-1] != coded[0]:
            index_chars.append(coded[0])
            index_starts.append(number(offset, 3))
        offset += len(record)
    if offset >= BASE**3:
        raise SystemExit(f"{offset} characters of lexicon, three digits reach {BASE**3}")

    unknown = cls(UNKNOWN_CLASS)
    share = (stats["unknown"].get(UNKNOWN_CLASS, 0) + 1) / (class_total[unknown] + 1)
    write_model(
        args.out,
        {
            "lexicon": lexicon,
            "max_surface": MAX_SURFACE,
            "index_chars": "".join(index_chars),
            "index_starts": "".join(index_starts),
            "flags": [flags_of(n) for n in names],
            "transitions": matrix,
            "transition_step": TRANSITION_STEP,
            "cost_step": COST_STEP,
            "unknown_class": unknown,
            "unknown_cost": round(-math.log(share) * 100),
        },
    )
    print(f"{size} classes, {len(records)} words, {used / 1024:.0f} KB, {corrected} corrections")


if __name__ == "__main__":
    main()
