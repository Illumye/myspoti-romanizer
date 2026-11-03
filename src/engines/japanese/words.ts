import { hepburn } from './hepburn';
import type { Token } from './lattice';
import { Flag, hasFlag } from './lexicon';

const NUMBER = /^[0-9]+$/;

/** A number in digits: written as it is, a word of its own (20 sai, dai 2 shō). */
function isNumber(token: Token): boolean {
  return NUMBER.test(token.surface);
}

/**
 * Whether [next] is written together with [token], as cutlet writes them: a prefix with what
 * follows (osake), a suffix, a conjunctive particle or an auxiliary with what precedes them
 * (bokura, omoeba, aishiteru, itta), but desu apart (tenki desu); and, unlike cutlet, a number
 * with its counter or its next digit (ichido, nijū). What is kept as it is written stands apart
 * from the words read around it, a number in digits alone, the kanji left unread together.
 */
function joined(token: Token, next: Token): boolean {
  if (token.reading === '' || next.reading === '') {
    return token.reading === '' && next.reading === '' && !isNumber(token) && !isNumber(next);
  }
  if (hasFlag(token.cls, Flag.prefix)) return true;
  if (hasFlag(next.cls, Flag.suffix) || hasFlag(next.cls, Flag.conjunctive)) return true;
  if (hasFlag(token.cls, Flag.numeral) && (hasFlag(next.cls, Flag.counter) || hasFlag(next.cls, Flag.numeral))) {
    return true;
  }
  return hasFlag(token.cls, Flag.conjugating) && hasFlag(next.cls, Flag.auxiliary) && !hasFlag(next.cls, Flag.desu);
}

// UniDic reads every 何 nan. It is nani before a particle that marks it and when it stands alone
// (nani ga, nani mo, nani?), nan before what starts with t, d or n and before a counter (nan de,
// nan no, nankai).
const NANI_BEFORE = new Set(['が', 'を', 'も', 'か', 'や', 'よ', 'は', 'へ', 'に', 'ね', 'さ', 'から', 'より', 'まで']);

function readingOf(token: Token, next: Token | undefined): string {
  const nani =
    token.surface === '何' && token.reading === 'ナン' && (next === undefined || NANI_BEFORE.has(next.surface));
  return nani ? 'ナニ' : token.reading;
}

/**
 * [tokens] in revised Hepburn, the words they make apart; a word that starts with a proper noun
 * capitalized (Tōkyō), what has no reading as it is written (20 sai, kimi to 龘). Null when a
 * reading cannot be written.
 */
export function romanizeTokens(tokens: readonly Token[]): string | null {
  const words: string[] = [];
  let reading = '';
  let written = '';
  let proper = false;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === undefined) break;
    const next = tokens[i + 1];
    if (reading === '' && written === '') proper = hasFlag(token.cls, Flag.proper);
    if (token.reading === '') written += token.surface;
    else reading += readingOf(token, next);
    if (next !== undefined && joined(token, next)) continue;
    if (written !== '') {
      words.push(written);
      written = '';
      continue;
    }
    // A word is converted whole, so a sokuon at the end of one token doubles the next: itta.
    const latin = hepburn(reading);
    if (latin === null) return null;
    words.push(proper ? latin.charAt(0).toUpperCase() + latin.slice(1) : latin);
    reading = '';
  }
  return words.join(' ');
}
