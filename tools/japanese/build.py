"""Builds the Japanese engine's model (src/engines/japanese/data/model.generated.ts) from the corpus
statistics (stats.py) and the lyrics corrections (corrections.tsv): the words seen most, within a
size budget, each with its reading, class and cost, the verbs and adjectives once each as a stem
the extension conjugates (inflections.py), and the cost of a class following another.

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
from encode import BASE, DIGITS, conjugations_code, number, reading_code, surface_code, write_model
from inflections import conjugations, ending_cost, has_kanji, words_of

TRANSITION_STEP = 20  # one transition digit is 0.2 nat: 20 hundredths
COST_STEP = 20  # and so is one cost digit: the same precision for words and transitions
SMOOTHING = 0.1
MAX_SURFACE = 8
UNKNOWN_CLASS = "名詞|普通名詞|一般"
NUMERAL_CLASS = "名詞|数詞|*"
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
    inflections = collections.Counter({tuple(row[:-1]): row[-1] for row in stats.get("inflections", [])})
    for *form, n in lyrics.get("inflections", []):
        inflections[tuple(form)] += n * weight
    stats["inflections"] = [[*form, n] for form, n in inflections.items()]


def indexed(records: list[tuple[str, str]]) -> tuple[str, str, str]:
    """[records] (coded surface, record) in the order the extension searches them, joined, with the
    first character of each block of them and where that block starts, three digits each."""
    records = sorted(records, key=lambda r: r[0].encode("utf-16-be"))
    chars, starts, offset = [], [], 0
    for coded, record in records:
        if not chars or chars[-1] != coded[0]:
            chars.append(coded[0])
            starts.append(number(offset, 3))
        offset += len(record)
    if offset >= BASE**3:
        raise SystemExit(f"{offset} characters of records, three digits reach {BASE**3}")
    return "".join(record for _, record in records), "".join(chars), "".join(starts)


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

    entries = {(s, p, c): [n, origin] for s, p, c, n, origin in stats["entries"] if len(s) <= MAX_SURFACE}
    corrected = apply_corrections(str(CORRECTIONS), entries)

    # Verbs and adjectives with a kanji in their stem, once each: the stem, its kind of conjugation
    # and its cost; per kind, the endings with theirs. What they take of the budget, the words lack.
    words = words_of(stats.get("inflections", []), {key: origin for key, (_, origin) in entries.items()})
    kinds, seen = conjugations(words)
    stems = {w: n for w, n in seen.items() if n >= args.min_count and has_kanji(w[0]) and len(w[0]) <= MAX_SURFACE}
    total = sum(stems.values())
    kind_ids = {kind: i for i, kind in enumerate(sorted({kind for _, _, kind in stems}))}
    table, generated = [], set()
    for kind in sorted(kind_ids, key=kind_ids.__getitem__):
        rows = []
        for key, (ending, reading, share) in sorted(kinds[kind].items()):
            c, code = cls(key), reading_code(reading)
            if c is not None and class_total[c] and code is not None:
                rows.append((surface_code(ending), code, c, ending_cost(share, class_total[c], total)))
        table.append(rows)
    stem_records = []
    for (stem, stem_reading, kind), n in stems.items():
        generated.update((stem + e, stem_reading + r, key) for key, (e, r, _) in kinds[kind].items())
        cost = min(BASE - 1, round(-math.log(n / total) * 100 / COST_STEP))
        record = f"{surface_code(stem)},{reading_code(stem_reading)}{number(kind_ids[kind], 2)}{number(cost, 1)}|"
        stem_records.append((surface_code(stem), record))
    stem_text, stem_chars, stem_starts = indexed(stem_records)
    conjugated = (stem_text, stem_chars, stem_starts, conjugations_code(table))
    budget = args.budget - sum(len(part.encode("utf-8")) for part in conjugated)

    # Words: the corrections applied, the forms seen most first, within the budget; the forms the
    # stems give left out.
    records, used = [], 0
    for (surface, pron, key), (count, origin) in sorted(entries.items(), key=lambda kv: -kv[1][0]):
        if count < args.min_count:
            break
        c = cls(key)
        reading = reading_code(hepburn_reading(pron, origin))
        if c is None or not class_total[c] or reading is None or any(ord(ch) > 0xFFFF for ch in surface):
            continue
        if (surface, hepburn_reading(pron, origin), key) in generated:
            continue
        cost = min(BASE - 1, round(-math.log(min(1.0, count / class_total[c])) * 100 / COST_STEP))
        coded = surface_code(surface)
        record = f"{coded},{reading}{number(c, 2)}{number(cost, 1)}|"
        if used + len(record.encode("utf-8")) > budget:
            break
        records.append((coded, record))
        used += len(record.encode("utf-8"))
    # Each block of a first character searched apart, so a search stays within it.
    lexicon, index_chars, index_starts = indexed(records)

    unknown = cls(UNKNOWN_CLASS)
    share = (stats["unknown"].get(UNKNOWN_CLASS, 0) + 1) / (class_total[unknown] + 1)
    # A number in digits is some numeral or other: it costs what one costs on average (the
    # entropy of the class), so that a word of the lexicon written with it (2人) still wins.
    numeral = cls(NUMERAL_CLASS)
    shares = [n / class_total[numeral] for (_, _, key), (n, _) in entries.items() if cls(key) == numeral]
    numeral_cost = round(-sum(q * math.log(q) for q in shares if 0 < q <= 1) * 100)
    write_model(
        args.out,
        {
            "lexicon": lexicon,
            "max_surface": MAX_SURFACE,
            "index_chars": index_chars,
            "index_starts": index_starts,
            "stems": stem_text,
            "max_stem": max((len(stem) for stem, _, _ in stems), default=0),
            "stem_index_chars": stem_chars,
            "stem_index_starts": stem_starts,
            "conjugations": conjugated[3],
            "flags": [flags_of(n) for n in names],
            "transitions": matrix,
            "transition_step": TRANSITION_STEP,
            "cost_step": COST_STEP,
            "unknown_class": unknown,
            "unknown_cost": round(-math.log(share) * 100),
            "numeral_class": numeral,
            "numeral_cost": numeral_cost,
        },
    )
    print(
        f"{size} classes, {len(records)} words, {used / 1024:.0f} KB, {corrected} corrections; "
        f"{len(stems)} verbs and adjectives, {(args.budget - budget) / 1024:.0f} KB, {len(table)} kinds"
    )


if __name__ == "__main__":
    main()
