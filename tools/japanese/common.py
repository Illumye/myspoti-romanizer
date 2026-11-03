"""What the corpus statistics, the lexicon builder and the evaluation share with the extension's
runtime: which characters make a Japanese run, how a reading is written, the classes of words."""

# The kana and Han ranges of src/domain/script.ts: a run of them is what the extension reads.
JAPANESE_RANGES = (
    (0x3005, 0x3007), (0x3021, 0x3029), (0x3031, 0x3035), (0x3038, 0x303B),
    (0x3040, 0x309F), (0x30A1, 0x30FA), (0x30FC, 0x30FF), (0x31F0, 0x31FF),
    (0x3400, 0x4DBF), (0x4E00, 0x9FFF), (0xF900, 0xFAFF), (0x20000, 0x323AF),
)

KATAKANA_READING = set(chr(c) for c in range(0x30A1, 0x30FB)) | {"ー"}

VOWELS = {
    "a": "アカガサザタダナハバパマヤャラワァヮヵ",
    "i": "イキギシジチヂニヒビピミリィヰ",
    "u": "ウクグスズツヅヌフブプムユュルヴゥ",
    "e": "エケゲセゼテデネヘベペメレェヱヶ",
    "o": "オコゴソゾトドノホボポモヨョロヲォ",
}
VOWEL_OF = {kana: vowel for vowel, kanas in VOWELS.items() for kana in kanas}


def is_japanese(ch: str) -> bool:
    cp = ord(ch)
    return any(lo <= cp <= hi for lo, hi in JAPANESE_RANGES)


def japanese_runs(line: str) -> list[str]:
    """The maximal runs of kana and Han in [line], each read alone, as the extension reads them."""
    runs, current = [], []
    for ch in line:
        if is_japanese(ch):
            current.append(ch)
        elif current:
            runs.append("".join(current))
            current = []
    if current:
        runs.append("".join(current))
    return runs


def is_reading(text: str | None) -> bool:
    return bool(text) and all(ch in KATAKANA_READING for ch in text)


def hepburn_reading(pron: str, goshu: str) -> str:
    """UniDic's pronunciation (ー where a vowel is held long) as revised Hepburn writes it: an e held
    long is ei in a Sino-Japanese word (sensei, eiga), an i held long ii but in a loanword (oishii,
    niisan, but kōhī); the other long vowels keep their ー, a macron (tōkyō, onēsan)."""
    out = []
    for i, ch in enumerate(pron):
        before = VOWEL_OF.get(pron[i - 1]) if i > 0 else None
        written_i = ch == "ー" and ((before == "e" and goshu == "漢") or (before == "i" and goshu != "外"))
        out.append("イ" if written_i else ch)
    return "".join(out)


def class_of(pos1: str, pos2: str, pos3: str, ctype: str, cform: str, surface: str) -> str:
    """The class of a word: what the words before and after it depend on. Conjugating words by
    their form, auxiliaries and particles one by one, the others by their part of speech."""
    if pos1 == "助動詞":
        return f"助動詞|{ctype}|{cform}"
    if pos1 in ("動詞", "形容詞"):
        return f"{pos1}|{pos2}|{cform}"
    if pos1 == "助詞":
        return f"助詞|{pos2}|{surface}"
    if pos1 == "名詞":
        return f"名詞|{pos2}|{pos3}"
    return f"{pos1}|{pos2}"


def class_key(feature, surface: str) -> str:
    """[class_of] for a word as fugashi gives it."""
    field = lambda name: getattr(feature, name, "*") or "*"  # noqa: E731
    return class_of(field("pos1"), field("pos2"), field("pos3"), field("cType"), field("cForm"), surface)


def backoff(key: str) -> str:
    """A coarser class for a rare one: its part of speech and sub-part."""
    return "|".join(key.split("|")[:2])
