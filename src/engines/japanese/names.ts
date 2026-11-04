import { PROPER } from './data/model.generated';
import { hepburn, toKatakana } from './hepburn';
import type { Pinned } from './lattice';
import { coded, entriesStartingWith, wordsAt } from './lexicon';

/** A reading of a kanji, in katakana, and as a name's spelling is compared ([key]). */
interface Reading {
  readonly kana: string;
  readonly key: string;
}

/** A name of the song: its spelling as it is compared, and as it is written. */
interface Name {
  readonly key: string;
  readonly spelling: string;
}

/**
 * A spelling as names are compared: lower case without accents, l as r (Luka is ルカ), a long vowel
 * written once (Tohoku, Yuko, Ohno), letters only.
 */
function key(latin: string): string {
  return latin
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/l/g, 'r')
    .replace(/ou|oo|oh(?![aeiouy])/g, 'o')
    .replace(/uu/g, 'u');
}

/** A name as the song writes it, but for one in capitals or in lower case alone: Teto. */
function spellingOf(name: string): string {
  const flat = name === name.toUpperCase() || name === name.toLowerCase();
  return flat ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : name;
}

function isKanji(c: string): boolean {
  return (c >= '㐀' && c <= '鿿') || (c >= '豈' && c <= '﫿') || c === '々';
}

function isKatakana(c: string): boolean {
  return (c >= 'ァ' && c <= 'ヺ') || c === 'ー';
}

function isKana(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    if (!((c >= 'ぁ' && c <= 'ゖ') || isKatakana(c))) return false;
  }
  return true;
}

function readingOf(kana: string): Reading | undefined {
  const latin = hepburn(kana);
  return latin === null || latin === '' ? undefined : { kana, key: key(latin) };
}

// A kanji after the first may start voiced: yu and tsuki make Yuzuki, yone and tsu Yonezu.
// prettier-ignore
const VOICED: Readonly<Record<string, string>> = {
  カ: 'ガ', キ: 'ギ', ク: 'グ', ケ: 'ゲ', コ: 'ゴ',
  サ: 'ザ', シ: 'ジ', ス: 'ズ', セ: 'ゼ', ソ: 'ゾ',
  タ: 'ダ', チ: 'ヂ', ツ: 'ヅ', テ: 'デ', ト: 'ド',
  ハ: 'バ', ヒ: 'ビ', フ: 'ブ', ヘ: 'ベ', ホ: 'ボ',
};

interface Readings {
  readonly first: readonly Reading[];
  readonly after: readonly Reading[];
}

const READINGS_LIMIT = 5_000;
const readingsMemo = new Map<string, Readings>();

/**
 * How [kanji] is read in the words of the lexicon that start with it: the word it is alone, the word
 * less the kana after it (重ね, kasane: kasa), the start of a compound's reading (音色, neiro: ne,
 * nei). Some of these are not its readings: a name must be read whole from them to be taken. After
 * the first kanji of a name, each may also start voiced.
 */
function readingsOf(kanji: string): Readings {
  const cached = readingsMemo.get(kanji);
  if (cached !== undefined) return cached;
  const kana = new Set<string>();
  for (const entry of entriesStartingWith(kanji)) {
    const rest = entry.surface.slice(1);
    if (rest === '') {
      kana.add(entry.reading);
    } else if (isKana(rest)) {
      const tail = toKatakana(rest);
      if (entry.reading.length > tail.length && entry.reading.endsWith(tail))
        kana.add(entry.reading.slice(0, -tail.length));
    } else {
      for (let n = 1; n <= 3 && n < entry.reading.length; n++) kana.add(entry.reading.slice(0, n));
    }
  }
  const first: Reading[] = [];
  const after: Reading[] = [];
  kana.forEach((k) => {
    const plain = readingOf(k);
    if (plain === undefined) return;
    first.push(plain);
    after.push(plain);
    const voiced = VOICED[k.charAt(0)];
    const variant = voiced === undefined ? undefined : readingOf(voiced + k.slice(1));
    if (variant !== undefined) after.push(variant);
  });
  if (readingsMemo.size >= READINGS_LIMIT) readingsMemo.clear();
  const readings = { first, after };
  readingsMemo.set(kanji, readings);
  return readings;
}

/** [span]'s kanji read as the name [name] (a key), one reading each, in katakana; undefined when they cannot be. */
function readAs(span: string, name: string): string | undefined {
  const failed = new Set<string>();
  const from = (i: number, at: number): string | undefined => {
    if (i === span.length) return at === name.length ? '' : undefined;
    if (failed.has(`${String(i)}:${String(at)}`)) return undefined;
    const readings = readingsOf(span.charAt(i));
    for (const reading of i === 0 ? readings.first : readings.after) {
      if (name.slice(at, at + reading.key.length) !== reading.key) continue;
      const rest = from(i + 1, at + reading.key.length);
      if (rest !== undefined) return reading.kana + rest;
    }
    failed.add(`${String(i)}:${String(at)}`);
    return undefined;
  };
  return from(0, 0);
}

/** Whether the lexicon has [surface] as a word read [reading]: then it is that word, not a name. */
function isWord(surface: string, reading: string): boolean {
  return wordsAt(coded(surface), 0, surface.length).some((w) => w.length === surface.length && w.reading === reading);
}

function pin(at: number, length: number, reading: string, name: Name): Pinned {
  return { at, word: { length, reading, cls: PROPER.cls, cost: 0, latin: name.spelling } };
}

/**
 * The names among [names] (the words of a song's title and artist) that [run] sings, pinned where
 * it sings them to be written as the song spells them: two kanji or more that read as one, in a way
 * no word of the lexicon is read (重音 is Kasane, but 桜 stays sakura), and a katakana word that is
 * one (テト, Teto).
 */
export function namesIn(run: string, names: readonly string[]): Pinned[] {
  const wanted = names.map((name) => ({ key: key(name), spelling: spellingOf(name) })).filter((n) => n.key.length >= 3);
  const pinned: Pinned[] = [];
  let start = 0;
  while (start < run.length) {
    const kanji = isKanji(run.charAt(start));
    const katakana = isKatakana(run.charAt(start));
    let end = start + 1;
    while (end < run.length && (kanji ? isKanji(run.charAt(end)) : katakana && isKatakana(run.charAt(end)))) end++;
    if (kanji) {
      for (let a = start; a + 2 <= end; a++) {
        for (let b = a + 2; b <= end; b++) {
          const span = run.slice(a, b);
          for (const name of wanted) {
            const reading = readAs(span, name.key);
            if (reading !== undefined && !isWord(span, reading)) pinned.push(pin(a, b - a, reading, name));
          }
        }
      }
    } else if (katakana) {
      const word = run.slice(start, end);
      const latin = hepburn(word);
      for (const name of wanted)
        if (latin !== null && key(latin) === name.key) pinned.push(pin(start, end - start, word, name));
    }
    start = end;
  }
  return pinned;
}
