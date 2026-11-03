"""Verbs and adjectives the extension conjugates itself rather than finding each form listed: songs
use forms subtitles hardly show (罵れば, 煽られて), and every form of every verb would not fit in the
script. A verb or an adjective is kept once, as its stem and its kind of conjugation (罵, 五段-ラ行),
and the extension adds the endings that kind takes (ら, り, っ, る, れ, ろ), each with its reading,
class and cost.

Learned from the corpus statistics (stats.py, `inflections`): each form seen of each verb and
adjective, with its dictionary form and its kind of conjugation (UniDic's cType)."""

import collections
import math

from common import hepburn_reading, is_reading

# The kinds whose dictionary form ends in the one kana their forms replace: 罵る 罵ら, 食べる 食べ,
# 美しい 美しく. The irregular verbs (する, 来る), the classical kinds and the auxiliaries stay listed.
REGULAR = ("五段-", "上一段-", "下一段-", "形容詞")
# The forms a kind takes this often are ones every word of it takes, whatever it means, so that a
# word sure to show one and never doing so has another way (行く has 行っ, never 行い): only these are
# checked. Rarer forms come or not with what a word means (the imperative of 思う).
CORE = 0.05
# A word seen often enough to show a core form this many times would show it, if it had it.
SURE = 20.0
# A core form fewer of the words sure to show it do show belongs to a few words, not to their kind:
# 行っ, of 行く and its compounds alone among the 五段-カ行 verbs.
REGULARITY = 0.8

def has_kanji(text: str) -> bool:
    return any("\u3400" <= ch <= "\u9fff" or "\uf900" <= ch <= "\ufaff" or ch == "々" for ch in text)


# A word: (stem, stem reading, kind), its kind being (cType, part of speech) as 動詞|一般. Its forms:
# (ending, ending reading, class) → count.
Word = tuple[str, str, tuple[str, str]]
Forms = collections.Counter


def words_of(inflections: list, origins: dict) -> dict[Word, Forms]:
    """The verbs and adjectives of a regular kind and the forms seen of each, the readings as the
    lexicon writes them (hepburn_reading). A word whose forms do not all start with its stem, in
    writing and reading, stays listed (言う: 言わ iwa, 言う yū)."""
    words: dict[Word, Forms] = collections.defaultdict(collections.Counter)
    broken: set[Word] = set()
    for surface, pron, key, base, base_pron, ctype, n in inflections:
        if not ctype.startswith(REGULAR) or len(base) < 2 or not is_reading(base_pron):
            continue
        origin = origins.get((surface, pron, key), "和")
        reading, base_reading = hepburn_reading(pron, origin), hepburn_reading(base_pron, origin)
        stem, stem_reading = base[:-1], base_reading[:-1]
        word = (stem, stem_reading, (ctype, "|".join(key.split("|")[:2])))
        if not surface.startswith(stem) or not reading.startswith(stem_reading):
            broken.add(word)
            continue
        words[word][surface[len(stem):], reading[len(stem_reading):], key] += n
    return {word: forms for word, forms in words.items() if word not in broken}


def _forms_of_kinds(words: dict[Word, Forms]) -> dict:
    """Each kind's forms: class → (ending, ending reading, share of the kind's forms), the ending
    its words take most for each class."""
    counts: dict = collections.defaultdict(collections.Counter)
    for (_, _, kind), forms in words.items():
        counts[kind].update(forms)
    kinds = {}
    for kind, counter in counts.items():
        total = sum(counter.values())
        best: dict = {}
        for (ending, reading, key), n in counter.most_common():
            best.setdefault(key, (ending, reading, n / total))
        kinds[kind] = best
    return kinds


def _fits(forms: Forms, total: float, table: dict) -> bool:
    """Whether a word with [forms] conjugates as [table] says: each of its forms one the table has,
    each core form of the table it is sure to show shown."""
    shown = {key: (ending, reading) for ending, reading, key in forms}
    if any(table.get(key, (None, None))[:2] != variant for key, variant in shown.items()):
        return False
    return all(key in shown for key, (_, _, share) in table.items() if share >= CORE and total * share >= SURE)


def conjugations(words: dict[Word, Forms]) -> tuple[dict, dict[Word, float]]:
    """The forms of each kind (class → ending, ending reading, share), the core ones only if they
    belong to the kind (REGULARITY), and the words that conjugate as their kind does, each with how
    often it is seen. Twice over: the shares of the second pass come from the words that fit, so a word that
    does not (行く) no longer weighs on the rest of its kind."""
    kept = words
    for _ in range(2):
        kinds = _forms_of_kinds(kept)
        for kind, table in kinds.items():
            for key in list(table):
                ending, reading, share = table[key]
                if share < CORE:
                    continue
                sure = [forms for (_, _, k), forms in kept.items() if k == kind and sum(forms.values()) * share >= SURE]
                showing = sum(1 for forms in sure if forms[ending, reading, key] > 0)
                if sure and showing / len(sure) < REGULARITY:
                    del table[key]
        kept = {word: forms for word, forms in words.items() if _fits(forms, sum(forms.values()), kinds.get(word[2], {}))}
    return _forms_of_kinds(kept), {word: float(sum(forms.values())) for word, forms in kept.items()}


def ending_cost(share: float, class_total: float, total: float) -> int:
    """What a form adds to its stem's cost, in hundredths of a nat: a form of a word seen n times is
    taken to be seen n * share times, its cost -log(n * share / class_total), and the stem holds
    -log(n / total) of it."""
    return round((-math.log(share) + math.log(class_total / total)) * 100)
