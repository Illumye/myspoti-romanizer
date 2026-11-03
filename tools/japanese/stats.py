"""Counts, over a corpus, the words of its Japanese runs as MeCab and UniDic read them: each word's
surface, pronunciation, class and origin, how classes follow one another within a run, how often
a class holds a word UniDic does not know, and the dictionary form of each verb and adjective seen
conjugated, from which the builder learns how they conjugate. The run is cut and read alone, as
the extension reads it.

Usage: stats.py CORPUS.txt[.gz] OUT.json.gz [--limit LINES]
"""

import argparse
import collections
import gzip
import json
import time
import unicodedata

import fugashi

from common import class_key, is_reading, japanese_runs

# What ties a conjugated verb or adjective to its dictionary form, and tells how it conjugates.
INFLECTION_FIELDS = ("orthBase", "pronBase", "cType")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("corpus")
    parser.add_argument("out")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    tagger = fugashi.Tagger()
    entries: collections.Counter = collections.Counter()
    classes: collections.Counter = collections.Counter()
    transitions: collections.Counter = collections.Counter()
    unknown: collections.Counter = collections.Counter()
    inflections: collections.Counter = collections.Counter()
    origin: dict = {}  # each entry's word origin (和, 漢, 外...), which tells how its long vowels are written
    started = time.time()
    lines = 0
    opener = gzip.open if args.corpus.endswith(".gz") else open
    with opener(args.corpus, "rt", encoding="utf-8", errors="replace") as corpus:
        for lines, raw in enumerate(corpus, start=1):
            if args.limit and lines > args.limit:
                break
            for run in japanese_runs(unicodedata.normalize("NFKC", raw.strip())):
                previous = "BOS"
                for word in tagger(run):
                    key = class_key(word.feature, word.surface)
                    classes[key] += 1
                    transitions[previous, key] += 1
                    previous = key
                    if word.is_unk:
                        unknown[key] += 1
                        continue
                    pron = getattr(word.feature, "pron", None)
                    if pron and is_reading(pron):
                        entries[word.surface, pron, key] += 1
                        origin.setdefault((word.surface, pron, key), getattr(word.feature, "goshu", "") or "")
                        if key.startswith(("動詞|", "形容詞|")):
                            base = [getattr(word.feature, name, "") or "" for name in INFLECTION_FIELDS]
                            inflections[(word.surface, pron, key, *base)] += 1
                transitions[previous, "EOS"] += 1
            if lines % 200_000 == 0:
                print(f"{lines} lines, {len(entries)} entries, {time.time() - started:.0f} s", flush=True)

    with gzip.open(args.out, "wt", encoding="utf-8") as out:
        json.dump(
            {
                "lines": lines,
                "entries": [[s, r, c, n, origin[s, r, c]] for (s, r, c), n in entries.items()],
                "classes": classes,
                "transitions": [[a, b, n] for (a, b), n in transitions.items()],
                "unknown": unknown,
                "inflections": [[*form, n] for form, n in inflections.items()],
            },
            out,
            ensure_ascii=False,
        )
    print(f"done: {lines} lines, {len(entries)} entries, {len(classes)} classes, {time.time() - started:.0f} s")


if __name__ == "__main__":
    main()
