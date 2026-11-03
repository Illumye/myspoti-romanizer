"""How MeCab and UniDic read each Japanese run of a file of lines: the reference the extension's
engine is measured against (evaluate.mjs). Writes JSON: [{ run, tokens: [[surface, reading]] }],
a reading null where UniDic has none.

Usage: reference.py LINES.txt OUT.json
"""

import argparse
import json
import unicodedata

import fugashi

from common import hepburn_reading, is_reading, japanese_runs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("lines")
    parser.add_argument("out")
    args = parser.parse_args()

    tagger = fugashi.Tagger()
    runs = []
    with open(args.lines, encoding="utf-8") as lines:
        for line in lines:
            for run in japanese_runs(unicodedata.normalize("NFKC", line.strip())):
                tokens = []
                for word in tagger(run):
                    pron = getattr(word.feature, "pron", None)
                    reading = hepburn_reading(pron, getattr(word.feature, "goshu", "")) if is_reading(pron) else None
                    if word.is_unk:
                        reading = word.surface if is_reading(word.surface) else None
                    tokens.append([word.surface, reading if reading and is_reading(reading) else None])
                runs.append({"run": run, "tokens": tokens})
    with open(args.out, "w", encoding="utf-8") as out:
        json.dump(runs, out, ensure_ascii=False)
    print(f"{len(runs)} runs")


if __name__ == "__main__":
    main()
