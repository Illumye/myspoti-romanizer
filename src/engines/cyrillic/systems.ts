/**
 * A Cyrillic romanization system: each letter of its alphabet (lower case) and its Latin form, and
 * the forms that depend on where the letter stands in its word. A letter outside the alphabet
 * leaves the word unromanized rather than read in another language's way.
 */
export interface CyrillicSystem {
  readonly letters: Readonly<Record<string, string>>;
  /** The letters written otherwise at the start of a word. */
  readonly initial?: Readonly<Record<string, string>>;
  /** The letters written otherwise right after one of [softeners]. */
  readonly afterSoftener?: Readonly<Record<string, string>>;
  readonly softeners?: string;
  /** Two letters written as one sound, checked before single letters (Ukrainian зг: "zgh"). */
  readonly pairs?: Readonly<Record<string, string>>;
  /** Word endings written otherwise (Bulgarian -ия: "ia"). */
  readonly endings?: Readonly<Record<string, string>>;
}

// The letters the six alphabets share, as most of them write them; each system sets what differs.
const SHARED: Readonly<Record<string, string>> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ж: 'zh',
  з: 'z',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
};

/** Russian, BGN/PCGN without diacritics: е is "ye" where it sounds so, the signs are silent. */
export const RUSSIAN: CyrillicSystem = {
  letters: { ...SHARED, и: 'i', й: 'y', ё: 'yo', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' },
  initial: { е: 'ye' },
  afterSoftener: { е: 'ye' },
  softeners: 'аеёиоуыэюяйъь',
};

/** Ukrainian, the national system of 2010: є ї й ю я take their y at the start of a word only. */
export const UKRAINIAN: CyrillicSystem = {
  letters: { ...SHARED, г: 'h', ґ: 'g', є: 'ie', и: 'y', і: 'i', ї: 'i', й: 'i', щ: 'shch', ь: '', ю: 'iu', я: 'ia' },
  initial: { є: 'ye', ї: 'yi', й: 'y', ю: 'yu', я: 'ya' },
  pairs: { зг: 'zgh' },
};

/** Belarusian, BGN/PCGN without diacritics: г is "h", ў "w", е "ye" where it sounds so. */
export const BELARUSIAN: CyrillicSystem = {
  letters: { ...SHARED, г: 'h', ґ: 'g', ё: 'yo', і: 'i', й: 'y', ў: 'w', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' },
  initial: { е: 'ye' },
  afterSoftener: { е: 'ye' },
  softeners: 'аеёіоуыэюяйўь',
};

/** Bulgarian, the Streamlined System of 2009: ъ is "a", щ "sht", a final -ия "ia". */
export const BULGARIAN: CyrillicSystem = {
  letters: { ...SHARED, и: 'i', й: 'y', х: 'h', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya', ѝ: 'i' },
  endings: { ия: 'ia' },
};

/** Serbian, its own Latin alphabet: one letter for one letter. */
export const SERBIAN: CyrillicSystem = {
  letters: {
    ...SHARED,
    ђ: 'đ',
    ж: 'ž',
    и: 'i',
    ј: 'j',
    љ: 'lj',
    њ: 'nj',
    ћ: 'ć',
    х: 'h',
    ц: 'c',
    ч: 'č',
    џ: 'dž',
    ш: 'š',
  },
};

/** Macedonian, the official system of 2008: ѓ is "gj", ќ "kj", ѕ "dz". */
export const MACEDONIAN: CyrillicSystem = {
  letters: {
    ...SHARED,
    ѓ: 'gj',
    ѕ: 'dz',
    и: 'i',
    ј: 'j',
    љ: 'lj',
    њ: 'nj',
    ќ: 'kj',
    х: 'h',
    ц: 'c',
    џ: 'dzh',
    ѐ: 'e',
    ѝ: 'i',
  },
};
