import { describe, expect, it } from 'vitest';
import { scriptOf, type Script } from '../../src/domain/script';

const cases: readonly (readonly [string, Script])[] = [
  ['あ', 'kana'],
  ['ア', 'kana'],
  ['ー', 'kana'],
  ['ｶ', 'kana'],
  ['・', 'neutral'],
  ['、', 'neutral'],
  ['「', 'neutral'],
  ['漢', 'han'],
  ['々', 'han'],
  ['𠀀', 'han'],
  ['한', 'hangul'],
  ['ㅋ', 'hangul'],
  ['Ж', 'cyrillic'],
  ['ў', 'cyrillic'],
  ['a', 'neutral'],
  ['é', 'neutral'],
  ['7', 'digit'],
  ['♪', 'neutral'],
  ['😀', 'neutral'],
  ['α', 'other'],
  ['ع', 'other'],
  ['ก', 'other'],
];

describe('scriptOf', () => {
  it.each(cases)('reads %s as %s', (char, script) => {
    expect(scriptOf(char.codePointAt(0) ?? 0)).toBe(script);
  });
});
