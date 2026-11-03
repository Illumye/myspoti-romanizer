import { scriptOf } from './script';
import { codePointAt, unitsOf } from './text';

/** The Cyrillic languages romanized, each with its own system. */
export type CyrillicLanguage = 'ru' | 'uk' | 'be' | 'bg' | 'sr' | 'mk';

/** A language an engine may romanize: what a run of a song is read as. */
export type Language = 'ja' | 'zh' | 'ko' | CyrillicLanguage;

/**
 * How the scripts of one song are read. Decided once for the whole song: a line of Han characters
 * alone is Japanese in a song that has kana elsewhere, and a Cyrillic word tells little of its
 * language while the song's letters together do.
 */
export interface SongLanguages {
  readonly han: 'ja' | 'zh';
  readonly cyrillic: CyrillicLanguage;
}

const CYRILLIC_LANGUAGES: readonly CyrillicLanguage[] = ['ru', 'uk', 'be', 'bg', 'sr', 'mk'];
const CHINESE = new Set(['zh', 'yue', 'cmn', 'wuu', 'nan', 'hak']);
const CYRILLIC_CONSONANTS = 'бвгґджзйклмнпрстфхцчшщђћјљњџѓќѕў';

/** The first subtag of a BCP 47 language tag, lower case: "ja-JP" is "ja". */
function primary(tag: string | undefined): string | undefined {
  const t = tag?.trim().toLowerCase();
  if (!t) return undefined;
  const end = t.search(/[-_]/);
  return end < 0 ? t : t.slice(0, end);
}

function isCyrillicLanguage(code: string | undefined): code is CyrillicLanguage {
  return CYRILLIC_LANGUAGES.some((l) => l === code);
}

function has(text: string, letters: string): boolean {
  for (let i = 0; i < letters.length; i++) if (text.includes(letters.charAt(i))) return true;
  return false;
}

/**
 * The Cyrillic language of [letters] (the song's Cyrillic text, lower case), from the letters only
 * one of them uses; Russian when none tells.
 */
export function cyrillicLanguageOf(letters: string): CyrillicLanguage {
  if (has(letters, 'ѓќѕ')) return 'mk';
  if (has(letters, 'ђћјљњџ')) return 'sr';
  if (has(letters, 'ў')) return 'be';
  if (has(letters, 'їєґ')) return 'uk';
  const russianOrBelarusian = has(letters, 'ыэё');
  if (has(letters, 'і')) return russianOrBelarusian ? 'be' : 'uk';
  // Bulgarian has no ы, э, ё, and writes ъ as a vowel, before consonants; Russian only before е, ё, ю, я.
  if (!russianOrBelarusian) {
    for (let i = letters.indexOf('ъ'); i >= 0; i = letters.indexOf('ъ', i + 1)) {
      if (CYRILLIC_CONSONANTS.includes(letters.charAt(i + 1))) return 'bg';
    }
  }
  return 'ru';
}

/** How [lines] are read, the source's language [hint] first ("ja", "uk-UA"), else what their letters show. */
export function songLanguages(lines: readonly string[], hint?: string): SongLanguages {
  const language = primary(hint);
  let kana = false;
  let cyrillic = '';
  for (const line of lines) {
    for (let i = 0; i < line.length;) {
      const cp = codePointAt(line, i);
      const script = scriptOf(cp);
      if (script === 'kana') kana = true;
      else if (script === 'cyrillic') cyrillic += String.fromCodePoint(cp);
      i += unitsOf(cp);
    }
  }
  const han = language === 'ja' ? 'ja' : language !== undefined && CHINESE.has(language) ? 'zh' : kana ? 'ja' : 'zh';
  return {
    han,
    cyrillic: isCyrillicLanguage(language) ? language : cyrillicLanguageOf(cyrillic.toLowerCase()),
  };
}
