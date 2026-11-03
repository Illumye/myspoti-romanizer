import { MAX_SURFACE, UNKNOWN } from './data/model.generated';
import { coded, transition, wordsAt, type Word } from './lexicon';

/** A word of a run, as the cheapest reading of the run cuts it. */
export interface Token {
  readonly surface: string;
  readonly reading: string;
  readonly cls: number;
}

interface Node {
  readonly start: number;
  readonly word: Word;
  best: number;
  previous: Node | undefined;
}

// What no word of the lexicon covers: a run of katakana is read as it is written (a loanword, a
// name), a lone kana too at a high cost; a kanji has no reading to guess, and leaves the run unread.
const LONE_KANA_COST = 2000;

function isKatakana(c: string): boolean {
  return (c >= 'ァ' && c <= 'ヺ') || c === 'ー';
}

function isKana(c: string): boolean {
  return (c >= 'ぁ' && c <= 'ゖ') || isKatakana(c);
}

function toKatakana(c: string): string {
  return c >= 'ぁ' && c <= 'ゖ' ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c;
}

function unknownWords(run: string, from: number, known: readonly Word[]): Word[] {
  const c = run.charAt(from);
  if (isKatakana(c)) {
    let end = from + 1;
    while (end < run.length && isKatakana(run.charAt(end))) end++;
    return [{ length: end - from, reading: run.slice(from, end), cls: UNKNOWN.cls, cost: UNKNOWN.cost }];
  }
  if (known.length === 0 && isKana(c)) {
    return [{ length: 1, reading: toKatakana(c), cls: UNKNOWN.cls, cost: LONE_KANA_COST }];
  }
  return [];
}

/**
 * [run], a run of kana and kanji, cut into words with their readings: the cheapest path through
 * every way the lexicon cuts it (Viterbi), as MeCab would read it. Null when a character has no word.
 */
export function tokenize(run: string): Token[] | null {
  const ending: Node[][] = [];
  for (let i = 0; i <= run.length; i++) ending.push([]);
  const start: Node = { start: 0, word: { length: 0, reading: '', cls: 0, cost: 0 }, best: 0, previous: undefined };
  ending[0]?.push(start);
  const key = coded(run);

  for (let i = 0; i < run.length; i++) {
    const before = ending[i] ?? [];
    if (before.length === 0) continue;
    const known = wordsAt(key, i, MAX_SURFACE);
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
  if (last === undefined) return null;
  const tokens: Token[] = [];
  for (let node: Node | undefined = last; node !== undefined && node !== start; node = node.previous) {
    tokens.push({
      surface: run.slice(node.start, node.start + node.word.length),
      reading: node.word.reading,
      cls: node.word.cls,
    });
  }
  return tokens.reverse();
}
