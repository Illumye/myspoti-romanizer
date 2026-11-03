import {
  COST_STEP,
  DIGITS,
  FLAGS,
  HIRAGANA,
  INDEX_CHARS,
  INDEX_STARTS,
  KANA,
  LEXICON,
  TRANSITIONS,
  TRANSITION_STEP,
} from './data/model.generated';

/** A word of the lexicon: its length in the text, its reading in katakana, its class and cost. */
export interface Word {
  readonly length: number;
  readonly reading: string;
  readonly cls: number;
  readonly cost: number;
}

const BASE = DIGITS.length;
const CLASSES = FLAGS.length;

// A digit's value by its character code: read in one step where indexOf would scan DIGITS.
const DIGIT_VALUE = new Int16Array(128);
for (let i = 0; i < DIGITS.length; i++) DIGIT_VALUE[DIGITS.charCodeAt(i)] = i;

function digit(text: string, at: number): number {
  return DIGIT_VALUE[text.charCodeAt(at)] ?? 0;
}

function twoDigits(text: string, at: number): number {
  return digit(text, at) * BASE + digit(text, at + 1);
}

function threeDigits(text: string, at: number): number {
  return (digit(text, at) * BASE + digit(text, at + 1)) * BASE + digit(text, at + 2);
}

// The records are `surface,reading` then class and cost, each ended by `|`, sorted by surface. A
// binary search over the characters of one first character's block finds a record's start with
// the native lastIndexOf, faster in Rhino than any index built in script.
function recordAt(offset: number): number {
  return LEXICON.lastIndexOf('|', offset - 1) + 1;
}

function surfaceAt(start: number): string {
  return LEXICON.slice(start, LEXICON.indexOf(',', start));
}

function nextRecord(start: number): number {
  return LEXICON.indexOf('|', start) + 1;
}

/** The block of the records whose surface starts with [c]: [start, end), or undefined. */
function blockOf(c: string): readonly [number, number] | undefined {
  const i = INDEX_CHARS.indexOf(c);
  if (i < 0) return undefined;
  const end = i + 1 < INDEX_CHARS.length ? threeDigits(INDEX_STARTS, (i + 1) * 3) : LEXICON.length;
  return [threeDigits(INDEX_STARTS, i * 3), end];
}

/**
 * The start of the first record of [lo, hi) whose surface is not before [key], or [hi]. Both
 * bounds stay at record starts, so the record around the middle never starts before [lo].
 */
function lowerBound(key: string, lo: number, hi: number): number {
  let low = lo;
  let high = hi;
  while (low < high) {
    const start = recordAt((low + high) >>> 1);
    if (surfaceAt(start) < key) low = nextRecord(start);
    else high = start;
  }
  return low;
}

// A record ends with its class in two digits and its cost in one.
function decode(start: number, length: number): Word {
  const end = LEXICON.indexOf('|', start);
  let reading = '';
  for (let i = start + length + 1; i < end - 3; i++) reading += KANA.charAt(digit(LEXICON, i));
  return { length, reading, cls: twoDigits(LEXICON, end - 3), cost: digit(LEXICON, end - 1) * COST_STEP };
}

// ASCII digits are the codes of hiragana: a number's own digits are spelled fullwidth, as
// tools/japanese/encode.py writes them in surfaces (2人).
const TO_FULLWIDTH = 0xff10 - 0x30;

/**
 * [run] as the lexicon spells its surfaces: each hiragana as its digit (a third of its UTF-8 in
 * the script), a number's digit fullwidth, the rest as it is. One character for one, so positions
 * stay the same.
 */
export function coded(run: string): string {
  let out = '';
  for (let i = 0; i < run.length; i++) {
    const c = run.charAt(i);
    if (c >= '0' && c <= '9') {
      out += String.fromCharCode(c.charCodeAt(0) + TO_FULLWIDTH);
      continue;
    }
    const k = HIRAGANA.indexOf(c);
    out += k < 0 ? c : DIGITS.charAt(k);
  }
  return out;
}

/** What the lexicon holds for a key: its words, and whether a longer word starts with it. */
interface Lookup {
  readonly words: readonly Word[];
  readonly prefix: boolean;
}

// Lyrics repeat their lines: what was looked up stays, within a bound, for the songs after.
const MEMO_LIMIT = 50_000;
const memo = new Map<string, Lookup>();

function lookup(key: string, block: readonly [number, number]): Lookup {
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  let start = lowerBound(key, block[0], block[1]);
  const prefix = start < block[1] && surfaceAt(start).startsWith(key);
  const words: Word[] = [];
  while (prefix && start < block[1] && surfaceAt(start) === key) {
    words.push(decode(start, key.length));
    start = nextRecord(start);
  }
  if (memo.size >= MEMO_LIMIT) memo.clear();
  const result = { words, prefix };
  memo.set(key, result);
  return result;
}

/**
 * The words of the lexicon that start [text] (a run [coded]) at [from], shortest first. The search
 * stops at the first length no word begins with, so a position costs a few searches only.
 */
export function wordsAt(text: string, from: number, maxLength: number): Word[] {
  const block = blockOf(text.charAt(from));
  if (block === undefined) return [];
  const found: Word[] = [];
  for (let length = 1; length <= maxLength && from + length <= text.length; length++) {
    const result = lookup(text.slice(from, from + length), block);
    if (!result.prefix) break;
    for (const word of result.words) found.push(word);
  }
  return found;
}

/** The cost of class [b] right after class [a], in hundredths of a nat; class 0 starts and ends a run. */
export function transition(a: number, b: number): number {
  return digit(TRANSITIONS, a * CLASSES + b) * TRANSITION_STEP;
}

/** What a class is, for spacing: the bits of the generated FLAGS. */
export const Flag = {
  prefix: 1,
  suffix: 2,
  conjunctive: 4,
  conjugating: 8,
  auxiliary: 16,
  desu: 32,
  proper: 64,
  numeral: 128,
  counter: 256,
} as const;

export function hasFlag(cls: number, flag: number): boolean {
  return ((FLAGS[cls] ?? 0) & flag) !== 0;
}
