import {
  CONJUGATIONS,
  COST_STEP,
  DIGITS,
  ENDING_COST_OFFSET,
  FLAGS,
  HIRAGANA,
  INDEX_CHARS,
  INDEX_STARTS,
  KANA,
  LEXICON,
  MAX_STEM,
  STEM_INDEX_CHARS,
  STEM_INDEX_STARTS,
  STEMS,
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

/** What the records hold for a key: their words, and whether a longer key starts with it. */
interface Lookup {
  readonly words: readonly Word[];
  readonly prefix: boolean;
}

/**
 * Records sorted by coded surface: the words, or the stems of the verbs and adjectives. Each is
 * `surface,reading` then a class (for a stem, its kind of conjugation) and a cost, ended by `|`;
 * [chars] and [starts] tell where the records of each first character start.
 */
interface Records {
  readonly text: string;
  readonly chars: string;
  readonly starts: string;
  readonly memo: Map<string, Lookup>;
}

const WORDS: Records = { text: LEXICON, chars: INDEX_CHARS, starts: INDEX_STARTS, memo: new Map() };
const STEM_RECORDS: Records = { text: STEMS, chars: STEM_INDEX_CHARS, starts: STEM_INDEX_STARTS, memo: new Map() };

// A binary search over the characters of one first character's block finds a record's start with
// the native lastIndexOf, faster in Rhino than any index built in script.
function recordAt(records: Records, offset: number): number {
  return records.text.lastIndexOf('|', offset - 1) + 1;
}

function surfaceAt(records: Records, start: number): string {
  return records.text.slice(start, records.text.indexOf(',', start));
}

function nextRecord(records: Records, start: number): number {
  return records.text.indexOf('|', start) + 1;
}

/** The block of the records whose surface starts with [c]: [start, end), or undefined. */
function blockOf(records: Records, c: string): readonly [number, number] | undefined {
  const i = records.chars.indexOf(c);
  if (i < 0) return undefined;
  const end = i + 1 < records.chars.length ? threeDigits(records.starts, (i + 1) * 3) : records.text.length;
  return [threeDigits(records.starts, i * 3), end];
}

/**
 * The start of the first record of [lo, hi) whose surface is not before [key], or [hi]. Both
 * bounds stay at record starts, so the record around the middle never starts before [lo].
 */
function lowerBound(records: Records, key: string, lo: number, hi: number): number {
  let low = lo;
  let high = hi;
  while (low < high) {
    const start = recordAt(records, (low + high) >>> 1);
    if (surfaceAt(records, start) < key) low = nextRecord(records, start);
    else high = start;
  }
  return low;
}

// A record ends with its class in two digits and its cost in one.
function decode(records: Records, start: number, length: number): Word {
  const text = records.text;
  const end = text.indexOf('|', start);
  let reading = '';
  for (let i = start + length + 1; i < end - 3; i++) reading += KANA.charAt(digit(text, i));
  return { length, reading, cls: twoDigits(text, end - 3), cost: digit(text, end - 1) * COST_STEP };
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

// Lyrics repeat their lines: what was looked up stays, within a bound, for the songs after.
const MEMO_LIMIT = 50_000;

function lookup(records: Records, key: string, block: readonly [number, number]): Lookup {
  const cached = records.memo.get(key);
  if (cached !== undefined) return cached;
  let start = lowerBound(records, key, block[0], block[1]);
  const prefix = start < block[1] && surfaceAt(records, start).startsWith(key);
  const words: Word[] = [];
  while (prefix && start < block[1] && surfaceAt(records, start) === key) {
    words.push(decode(records, start, key.length));
    start = nextRecord(records, start);
  }
  if (records.memo.size >= MEMO_LIMIT) records.memo.clear();
  const result = { words, prefix };
  records.memo.set(key, result);
  return result;
}

/**
 * The records that start [text] (a run [coded]) at [from], shortest first. The search stops at the
 * first length no record begins with, so a position costs a few searches only.
 */
function startingAt(records: Records, text: string, from: number, maxLength: number): Word[] {
  const block = blockOf(records, text.charAt(from));
  if (block === undefined) return [];
  const found: Word[] = [];
  for (let length = 1; length <= maxLength && from + length <= text.length; length++) {
    const result = lookup(records, text.slice(from, from + length), block);
    if (!result.prefix) break;
    for (const word of result.words) found.push(word);
  }
  return found;
}

/** The words of the lexicon that start [text] (a run [coded]) at [from], shortest first. */
export function wordsAt(text: string, from: number, maxLength: number): Word[] {
  return startingAt(WORDS, text, from, maxLength);
}

/** A form a kind of conjugation takes: the ending after the stem (coded), its reading, class and cost. */
interface Ending {
  readonly ending: string;
  readonly reading: string;
  readonly cls: number;
  readonly cost: number;
}

function endingOf(row: string): Ending {
  const comma = row.indexOf(',');
  let reading = '';
  for (let i = comma + 1; i < row.length - 4; i++) reading += KANA.charAt(digit(row, i));
  const cost = twoDigits(row, row.length - 2) - ENDING_COST_OFFSET;
  return { ending: row.slice(0, comma), reading, cls: twoDigits(row, row.length - 4), cost };
}

// Each kind's forms, read once from CONJUGATIONS: `ending,reading`, class and cost, `|` after each,
// a space between kinds.
const ENDINGS: readonly (readonly Ending[])[] = CONJUGATIONS.split(' ').map((kind) =>
  kind === '' ? [] : kind.slice(0, -1).split('|').map(endingOf),
);

/**
 * The forms of the verbs and adjectives whose stem starts [text] (a run [coded]) at [from]: the
 * stem with each ending its kind takes that follows it there, read and costed as the stem and the
 * ending together (罵 and れ: 罵れ, nonoshire).
 */
export function conjugatedAt(text: string, from: number): Word[] {
  const found: Word[] = [];
  for (const stem of startingAt(STEM_RECORDS, text, from, MAX_STEM)) {
    const at = from + stem.length;
    for (const form of ENDINGS[stem.cls] ?? []) {
      if (text.slice(at, at + form.ending.length) !== form.ending) continue;
      const length = stem.length + form.ending.length;
      found.push({ length, reading: stem.reading + form.reading, cls: form.cls, cost: stem.cost + form.cost });
    }
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
