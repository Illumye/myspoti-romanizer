import { describe, expect, it } from 'vitest';
import { japanese } from '../../src/engines/japanese';
import { tokenize } from '../../src/engines/japanese/lattice';
import { coded, conjugatedAt, wordsAt } from '../../src/engines/japanese/lexicon';

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
    expect(japanese.romanize('三十路を過ぎて')).toBe('misoji o sugite');
    expect(japanese.romanize('二十歳になった')).toBe('hatachi ni natta');
    expect(japanese.romanize('日本刀を抜いて')).toBe('nihontō o nuite');
    expect(japanese.romanize('浮き世の夢')).toBe('ukiyo no yume');
    expect(japanese.romanize('一つだけ')).toBe('hitotsu dake');
    expect(japanese.romanize('一つ一つ')).toBe('hitotsu hitotsu');
  });

  it('reads a number in digits as a numeral, kept in digits, with its counter after it', () => {
    expect(japanese.romanize('17歳')).toBe('17 sai');
    expect(japanese.romanize('3人で')).toBe('3 nin de');
    expect(japanese.romanize('10時に')).toBe('10 ji ni');
    expect(japanese.romanize('5分だけ')).toBe('5 fun dake');
    expect(japanese.romanize('第2章')).toBe('dai 2 shō');
    expect(japanese.romanize('21人')).toBe('21 nin');
  });

  it('reads a number in digits the way it is said where its count is a word of its own', () => {
    expect(japanese.romanize('20歳の夏')).toBe('hatachi no natsu');
    expect(japanese.romanize('2人で歩いた')).toBe('futari de aruita');
    expect(japanese.romanize('1つだけ')).toBe('hitotsu dake');
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

  it('conjugates a verb kept once, as its stem, into forms the corpus never showed', () => {
    expect(japanese.romanize('友さえも罵れば')).toBe('tomo sae mo nonoshireba');
    expect(japanese.romanize('姿を倣えばいい')).toBe('sugata o naraeba ii');
    expect(japanese.romanize('風に煽られて')).toBe('kaze ni aorarete');
  });

  it('gives a verb only the forms it takes: 行く has 行っ, and 行い stays okonai', () => {
    expect(japanese.romanize('行ってきます')).toBe('itte kimasu');
    expect(japanese.romanize('行いを正す')).toBe('okonai o tadasu');
  });

  it('reads a katakana word no entry has as it is written', () => {
    expect(japanese.romanize('ズッキュンドッキュン')).toBe('zukkyundokkyun');
  });

  it('keeps a kanji it has no reading for as it is written, and reads the rest', () => {
    expect(japanese.romanize('龘')).toBe('龘');
    expect(japanese.romanize('君と龘龘の歌')).toBe('kimi to 龘龘 no uta');
  });
});

describe('tokenize', () => {
  it('cuts a run into words with their readings', () => {
    expect(tokenize('君を愛してる').map((t) => [t.surface, t.reading])).toEqual([
      ['君', 'キミ'],
      ['を', 'オ'],
      ['愛し', 'アイシ'],
      ['てる', 'テル'],
    ]);
  });
});

describe('conjugatedAt', () => {
  it('gives the forms of a stem that the text goes on with, read as stem and ending', () => {
    const forms = conjugatedAt(coded('罵れば'), 0);
    expect(forms.some((form) => form.length === 2 && form.reading === 'ノノシレ')).toBe(true);
    expect(forms.every((form) => form.length <= 3)).toBe(true);
  });

  it('gives nothing where no stem starts', () => {
    expect(conjugatedAt(coded('ありがとう'), 0)).toEqual([]);
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
