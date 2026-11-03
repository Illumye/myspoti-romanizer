import { assemble, type Part } from './assemble';
import { songLanguages, type SongLanguages } from './language';
import type { Engines } from './romanizer';
import { languageRuns, scriptRuns } from './runs';

/**
 * [line] in Latin letters, or null when a piece of it has no engine, or its engine cannot read it
 * all: a line is romanized whole or not at all.
 */
export function romanizeLine(line: string, languages: SongLanguages, engines: Engines): string | null {
  const parts: Part[] = [];
  let romanized = false;
  for (const run of languageRuns(scriptRuns(line), languages)) {
    if (run.language === null) {
      parts.push({ romanized: false, text: run.text });
      continue;
    }
    if (run.language === 'other') return null;
    const latin = engines[run.language]?.romanize(run.text) ?? null;
    if (latin === null) return null;
    parts.push({ romanized: true, text: latin });
    romanized = true;
  }
  return romanized ? assemble(parts) : null;
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
