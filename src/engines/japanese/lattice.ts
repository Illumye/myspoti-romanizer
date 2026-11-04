import { MAX_SURFACE, NUMERAL, UNKNOWN } from './data/model.generated';
import { coded, conjugatedAt, transition, wordsAt, type Word } from './lexicon';

/** A word of a run, as the cheapest reading of the run cuts it; a name with the song's spelling of it. */
export interface Token {
  readonly surface: string;
  readonly reading: string;
  readonly cls: number;
  readonly latin?: string | undefined;
}

/** A word known at a place of a run before it is read: a name the song sings there (names.ts). */
export interface Pinned {
  readonly at: number;
  readonly word: Word;
}

interface Node {
  readonly start: number;
  readonly word: Word;
  best: number;
  previous: Node | undefined;
}

// What no word of the lexicon covers: a run of katakana is read as it is written (a loanword, a
// name), a lone kana too at a high cost; a number in digits is a numeral, so that what follows reads
// as its counter (20歳, sai), and is kept in digits. A kanji has no reading to guess: it is kept as
// it is written, at a cost no reading comes near, so that the run is read around it, and so is a
// kana words start at but no way through goes on from.
const LONE_KANA_COST = 2000;
const UNREAD_COST = 10_000;

function isDigit(c: string): boolean {
  return c >= '0' && c <= '9';
}

function isKatakana(c: string): boolean {
  return (c >= 'ァ' && c <= 'ヺ') || c === 'ー';
}

function isKana(c: string): boolean {
  return (c >= 'ぁ' && c <= 'ゖ') || isKatakana(c);
}

function toKatakana(c: string): string {
  return c >= 'ぁ' && c <= 'ゖ' ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c;
}

/** Where the characters from [from] that pass [test] end. */
function spanEnd(run: string, from: number, test: (c: string) => boolean): number {
  let end = from + 1;
  while (end < run.length && test(run.charAt(end))) end++;
  return end;
}

function unknownWords(run: string, from: number, known: readonly Word[]): Word[] {
  const c = run.charAt(from);
  if (isDigit(c)) {
    const end = spanEnd(run, from, isDigit);
    return [{ length: end - from, reading: '', cls: NUMERAL.cls, cost: NUMERAL.cost }];
  }
  if (isKatakana(c)) {
    const end = spanEnd(run, from, isKatakana);
    return [{ length: end - from, reading: run.slice(from, end), cls: UNKNOWN.cls, cost: UNKNOWN.cost }];
  }
  if (isKana(c)) {
    return [
      { length: 1, reading: toKatakana(c), cls: UNKNOWN.cls, cost: known.length === 0 ? LONE_KANA_COST : UNREAD_COST },
    ];
  }
  return [{ length: 1, reading: '', cls: UNKNOWN.cls, cost: UNREAD_COST }];
}

/**
 * [run], a run of kana and kanji, cut into words with their readings: the cheapest path through
 * every way the lexicon cuts it (Viterbi), as MeCab would read it, with the words [pinned] at their
 * places besides. A word kept as it is written (a number in digits, a kanji without a reading) has
 * an empty reading.
 */
export function tokenize(run: string, pinned: readonly Pinned[] = []): Token[] {
  const ending: Node[][] = [];
  for (let i = 0; i <= run.length; i++) ending.push([]);
  const start: Node = { start: 0, word: { length: 0, reading: '', cls: 0, cost: 0 }, best: 0, previous: undefined };
  ending[0]?.push(start);
  const key = coded(run);

  for (let i = 0; i < run.length; i++) {
    const before = ending[i] ?? [];
    if (before.length === 0) continue;
    const known = wordsAt(key, i, MAX_SURFACE).concat(conjugatedAt(key, i));
    for (const pin of pinned) if (pin.at === i) known.push(pin.word);
    for (const word of known.concat(unknownWords(run, i, known))) {
      const node: Node = { start: i, word, best: Infinity, previous: undefined };
      for (const previous of before) {
        const cost = previous.best + transition(previous.word.cls, word.cls) + word.cost;
        if (cost < node.best) {
          node.best = cost;
          node.previous = previous;
        }
      }
      ending[i + word.length]?.push(node);
    }
  }

  let last: Node | undefined;
  let best = Infinity;
  for (const node of ending[run.length] ?? []) {
    const cost = node.best + transition(node.word.cls, 0);
    if (cost < best) {
      best = cost;
      last = node;
    }
  }
  if (last === undefined) return [];
  const tokens: Token[] = [];
  for (let node: Node | undefined = last; node !== undefined && node !== start; node = node.previous) {
    tokens.push({
      surface: run.slice(node.start, node.start + node.word.length),
      reading: node.word.reading,
      cls: node.word.cls,
      latin: node.word.latin,
    });
  }
  return tokens.reverse();
}
