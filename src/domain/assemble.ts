import { scriptOf } from './script';

/** A piece of a romanized line: Latin letters an engine wrote, or text kept as it was. */
export interface Part {
  readonly romanized: boolean;
  readonly text: string;
}

// East Asian punctuation NFKC leaves as it is, in its Latin form.
const PUNCTUATION = new Map([
  ['、', ', '],
  ['。', '. '],
  ['「', '"'],
  ['」', '"'],
  ['『', '"'],
  ['』', '"'],
  ['《', '"'],
  ['》', '"'],
  ['【', '['],
  ['】', ']'],
  ['〖', '['],
  ['〗', ']'],
  ['〔', '('],
  ['〕', ')'],
  ['〈', '<'],
  ['〉', '>'],
  ['〜', '~'],
  ['〰', '~'],
  ['・', ' '],
  ['゠', '='],
  ['〽', ''],
]);

function latinPunctuation(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    out += PUNCTUATION.get(c) ?? c;
  }
  return out;
}

// Letters and digits a word is made of once in Latin letters, diacritics included (ō, š, ć), and
// the letters of a word kept as it is written, which no engine read (koi no Δ).
function isWordChar(c: string): boolean {
  const script = scriptOf(c.charCodeAt(0));
  return /[0-9A-Za-zÀ-ɏḀ-ỿ]/.test(c) || (script !== 'neutral' && script !== 'digit');
}

// Where two parts join, a word after one of these starts a new phrase: "kimi! boku".
const PHRASE_END = '!?.,;:';

function needsSpace(before: string, next: string): boolean {
  return isWordChar(next) && (isWordChar(before) || PHRASE_END.includes(before));
}

function tidy(line: string): string {
  return line
    .replace(/\s+/g, ' ')
    .replace(/ ([,.!?;:)\]>])/g, '$1')
    .replace(/([([<]) /g, '$1')
    .trim();
}

/**
 * [parts] as one line: East Asian punctuation in its Latin form, a space where two parts join
 * between two words or after the end of a phrase, one space at most anywhere.
 */
export function assemble(parts: readonly Part[]): string {
  let line = '';
  for (const part of parts) {
    const text = part.romanized ? part.text : latinPunctuation(part.text);
    if (text === '') continue;
    if (line !== '' && needsSpace(line.charAt(line.length - 1), text.charAt(0))) line += ' ';
    line += text;
  }
  return tidy(line);
}
