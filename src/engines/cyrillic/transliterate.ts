import type { CyrillicSystem } from './systems';

// An apostrophe inside a word (Ukrainian м'ясо, Belarusian сям'я) only marks how the next letter sounds.
const APOSTROPHES = "'ʼ’";

function isUpper(c: string): boolean {
  return c !== c.toLowerCase();
}

function isLetter(c: string): boolean {
  return c.toLowerCase() !== c.toUpperCase();
}

/**
 * [latin] in the case of the letters it stands for, [word] from [start], [length] long: a capital
 * starts a capitalized word ("Zh"), unless a capital stands next to it ("ZH" in a word in capitals).
 */
function cased(latin: string, word: string, start: number, length: number): string {
  if (!isUpper(word.charAt(start))) return latin;
  const before = word.charAt(start - 1);
  const after = word.charAt(start + length);
  if ((before !== '' && isUpper(before)) || (after !== '' && isUpper(after))) return latin.toUpperCase();
  return latin.charAt(0).toUpperCase() + latin.slice(1);
}

/** The Latin form and length of what [system] reads at [i] of [lower] (the word in lower case). */
function readAt(lower: string, i: number, system: CyrillicSystem): readonly [string, number] | undefined {
  const rest = lower.slice(i);
  const ending = system.endings?.[rest];
  if (ending !== undefined) return [ending, rest.length];
  const pair = system.pairs?.[lower.slice(i, i + 2)];
  if (pair !== undefined) return [pair, 2];
  const c = lower.charAt(i);
  const positional =
    i === 0
      ? system.initial?.[c]
      : system.softeners?.includes(lower.charAt(i - 1))
        ? system.afterSoftener?.[c]
        : undefined;
  const latin = positional ?? system.letters[c];
  return latin === undefined ? undefined : [latin, 1];
}

/**
 * [word], a run of Cyrillic letters, in Latin letters by [system]; null when it holds a letter
 * outside the system's alphabet. A mark that is not a letter (a stress accent) is kept.
 */
export function transliterate(word: string, system: CyrillicSystem): string | null {
  const lower = word.toLowerCase();
  let out = '';
  let i = 0;
  while (i < word.length) {
    const c = word.charAt(i);
    if (APOSTROPHES.includes(c)) {
      i++;
      continue;
    }
    const read = readAt(lower, i, system);
    if (read === undefined) {
      if (isLetter(c)) return null;
      out += c;
      i++;
      continue;
    }
    out += cased(read[0], word, i, read[1]);
    i += read[1];
  }
  return out;
}
