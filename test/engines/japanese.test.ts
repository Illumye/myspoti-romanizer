import { describe, expect, it } from 'vitest';
import { japanese } from '../../src/engines/japanese';
import { tokenize } from '../../src/engines/japanese/lattice';
import { coded, wordsAt } from '../../src/engines/japanese/lexicon';

describe('japanese', () => {
  // Revised Hepburn, as MeCab reads the line: particles as said (wa, e, o), long vowels with a
  // macron but ei and ii as written, words spaced the way cutlet spaces them.
  it.each([
    ['君を愛してる', 'kimi o aishiteru'],
    ['今日はいい天気ですね', 'kyō wa ii tenki desu ne'],
    ['東京へ行った', 'Tōkyō e itta'],
    ['思い出せない夢の中で', 'omoidasenai yume no naka de'],
    ['僕らはまだ知らない', 'bokura wa mada shiranai'],
    ['空に向かって歌おう', 'sora ni mukatte utaō'],
    ['心の中で叫んでいる', 'kokoro no naka de sakende iru'],
    ['ありがとう', 'arigatō'],
    ['先生', 'sensei'],
    ['美味しいラーメンを食べた', 'oishii rāmen o tabeta'],
  ])('writes %s as %s', (line, latin) => {
    expect(japanese.romanize(line)).toBe(latin);
  });

  it('reads the words songs say otherwise than UniDic does', () => {
    expect(japanese.romanize('私の名前')).toBe('watashi no namae');
    expect(japanese.romanize('明日また会おう')).toBe('ashita mata aō');
    expect(japanese.romanize('お母さん')).toBe('okāsan');
    expect(japanese.romanize('並ぶ影が二つ')).toBe('narabu kage ga futatsu');
    expect(japanese.romanize('風に吹かれて')).toBe('kaze ni fukarete');
  });

  it('reads 何 nani before a particle that marks it, nan before t, d, n', () => {
    expect(japanese.romanize('何が欲しい')).toBe('nani ga hoshii');
    expect(japanese.romanize('何も言えない')).toBe('nani mo ienai');
    expect(japanese.romanize('何でもないや')).toBe('nan de mo nai ya');
    expect(japanese.romanize('何の歌')).toBe('nan no uta');
  });

  it('writes a number with its counter as one word', () => {
    expect(japanese.romanize('人生は一度だけ')).toBe('jinsei wa ichido dake');
  });

  it('reads a katakana word no entry has as it is written', () => {
    expect(japanese.romanize('ズッキュンドッキュン')).toBe('zukkyundokkyun');
  });

  it('gives nothing for a kanji it has no reading for', () => {
    expect(japanese.romanize('龘')).toBeNull();
  });
});

describe('tokenize', () => {
  it('cuts a run into words with their readings', () => {
    expect(tokenize('君を愛してる')?.map((t) => [t.surface, t.reading])).toEqual([
      ['君', 'キミ'],
      ['を', 'オ'],
      ['愛し', 'アイシ'],
      ['てる', 'テル'],
    ]);
  });
});

describe('wordsAt', () => {
  it('finds every word that starts at a position, shortest first', () => {
    const words = wordsAt(coded('今日は'), 0, 8).map((w) => [w.length, w.reading]);
    expect(words).toContainEqual([2, 'キョー']);
    expect(words.every(([length], i, all) => i === 0 || Number(length) >= Number(all[i - 1]?.[0]))).toBe(true);
  });

  it('finds nothing where no word starts', () => {
    expect(wordsAt(coded('ゞゞ'), 0, 8)).toEqual([]);
  });
});
