import { describe, expect, it } from 'vitest';
import { hepburn } from '../../src/engines/japanese/hepburn';

describe('hepburn', () => {
  // Readings as UniDic writes their pronunciation: ー where a vowel is held long.
  it.each([
    ['トーキョー', 'tōkyō'],
    ['ガッコー', 'gakkō'],
    ['コーヒー', 'kōhī'],
    ['オカーサン', 'okāsan'],
    ['ラーメン', 'rāmen'],
    ['センセイ', 'sensei'],
    ['オイシイ', 'oishii'],
    ['オモウ', 'omou'],
    ['シンブン', 'shinbun'],
    ['カンイ', "kan'i"],
    ['シンヤ', "shin'ya"],
    ['マッチャ', 'matcha'],
    ['イッテ', 'itte'],
    ['キッス', 'kissu'],
    ['ジャンプ', 'janpu'],
    ['ツヅキ', 'tsuzuki'],
    ['フジサン', 'fujisan'],
    ['ティー', 'tī'],
    ['ファイト', 'faito'],
    ['ヴァイオリン', 'vaiorin'],
    ['ワタシワ', 'watashiwa'],
  ])('writes %s as %s', (kana, latin) => {
    expect(hepburn(kana)).toBe(latin);
  });

  it('reads hiragana as its katakana, the long vowels as they are spelled', () => {
    expect(hepburn('きみをあいしてる')).toBe('kimioaishiteru');
    expect(hepburn('おかあさん')).toBe('okaasan');
  });

  it('reads the iteration marks as the kana before them', () => {
    expect(hepburn('いすゞ')).toBe('isuzu');
    expect(hepburn('こゝろ')).toBe('kokoro');
  });

  it('leaves out a sokuon with no consonant after it', () => {
    expect(hepburn('アッ')).toBe('a');
  });

  it('gives nothing for what is not kana', () => {
    expect(hepburn('漢字')).toBeNull();
  });
});
