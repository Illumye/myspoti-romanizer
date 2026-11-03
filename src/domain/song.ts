import { assemble, type Part } from './assemble';
import { songLanguages, type SongLanguages } from './language';
import type { Engines } from './romanizer';
import { languageRuns, scriptRuns } from './runs';
import { scriptOf } from './script';
import { codePointAt, unitsOf } from './text';

// A romanization that leaves more than this share of a line's letters as they are written does not
// help read it, and the line is likely in a language no engine reads (Chinese in a Japanese song).
const MAX_UNREAD = 1 / 4;

/** How many letters of [text] are of a script a romanization changes: not Latin, digits, punctuation. */
function lettersIn(text: string): number {
  let letters = 0;
  for (let i = 0; i < text.length;) {
    const cp = codePointAt(text, i);
    const script = scriptOf(cp);
    if (script !== 'neutral' && script !== 'digit') letters++;
    i += unitsOf(cp);
  }
  return letters;
}

/**
 * [line] in Latin letters, what no engine reads kept as it is written (a kanji the lexicon has no
 * reading for, a script no engine romanizes); null when that is more than a quarter of its letters.
 */
export function romanizeLine(line: string, languages: SongLanguages, engines: Engines): string | null {
  const parts: Part[] = [];
  for (const run of languageRuns(scriptRuns(line), languages)) {
    const engine = run.language === null || run.language === 'other' ? undefined : engines[run.language];
    const latin = engine?.romanize(run.text) ?? null;
    parts.push(latin === null ? { romanized: false, text: run.text } : { romanized: true, text: latin });
  }
  const latin = assemble(parts);
  const letters = lettersIn(line);
  const unread = lettersIn(latin);
  return unread < letters && unread <= letters * MAX_UNREAD ? latin : null;
}

/**
 * The romanizations [engines] can write for a song's [lines] (index → text), read as a whole: index
 * → the line in Latin letters. [hint]: the lyrics' language when their source says it ("ja"). A line
 * that would not change is left out. Lines are read in order until [shouldStop] says so: what is
 * done by then is kept, the rest left for another time.
 */
export function romanizeSong(
  lines: ReadonlyMap<number, string>,
  engines: Engines,
  hint?: string,
  shouldStop: () => boolean = () => false,
): Map<number, string> {
  // Compatibility forms first: halfwidth katakana, fullwidth Latin, squared words (㌔ is キロ).
  const normalized = new Map<number, string>();
  lines.forEach((text, index) => normalized.set(index, text.normalize('NFKC')));
  const languages = songLanguages(Array.from(normalized.values()), hint);
  const out = new Map<number, string>();
  for (const [index, text] of Array.from(normalized)) {
    if (shouldStop()) break;
    const latin = romanizeLine(text, languages, engines);
    if (latin !== null && latin !== '' && latin !== text) out.set(index, latin);
  }
  return out;
}
