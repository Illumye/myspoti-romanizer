"""The lyrics corrections (corrections.tsv) applied to the corpus entries before the lexicon is
chosen: readings songs use where UniDic reads otherwise, words it cuts apart."""

# An entry: (surface, pronunciation, class) → [count, origin].
Entries = dict[tuple[str, str, str], list]


def apply_corrections(path: str, entries: Entries) -> int:
    """Changes [entries] as [path] says; the number of corrections applied. A correction that finds
    nothing to change stops the build: the corpus or UniDic changed, and it must be looked at."""
    applied = 0
    with open(path, encoding="utf-8") as lines:
        for number, line in enumerate(lines, start=1):
            if not line.strip() or line.startswith("#"):
                continue
            action, surface, pron, *rest = line.rstrip("\n").split("\t")
            matches = [key for key in entries if key[0] == surface and key[1] == pron]
            if action == "reread":
                if not matches:
                    raise SystemExit(f"corrections.tsv:{number}: no {surface} read {pron}")
                for key in matches:
                    count, origin = entries.pop(key)
                    target = (surface, rest[0], key[2])
                    entries.setdefault(target, [0, origin])[0] += count
            elif action == "drop":
                if not matches:
                    raise SystemExit(f"corrections.tsv:{number}: no {surface} read {pron}")
                for key in matches:
                    del entries[key]
            elif action == "add":
                cls, origin, count = rest[0], rest[1], int(rest[2])
                entries[surface, pron, cls] = [count, origin]
            else:
                raise SystemExit(f"corrections.tsv:{number}: unknown action {action}")
            applied += 1
    return applied
