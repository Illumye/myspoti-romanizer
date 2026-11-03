import { describe, expect, it } from 'vitest';
import { korean } from '../../src/engines/korean';

describe('korean', () => {
  // The Revised Romanization writes the pronunciation: liaison, assimilation, palatalization.
  it.each([
    ['사랑해', 'saranghae'],
    ['같이', 'gachi'],
    ['신라', 'silla'],
    ['국물', 'gungmul'],
    ['한국어', 'hangugeo'],
    ['좋아', 'joa'],
    ['학교', 'hakgyo'],
    ['합니다', 'hamnida'],
    ['종로', 'jongno'],
    ['굳이', 'guji'],
    ['놓다', 'nota'],
  ])('writes %s as %s', (hangul, latin) => {
    expect(korean.romanize(hangul)).toBe(latin);
  });

  it('writes lone Jamo, and gives nothing for the archaic ones es-hangul leaves in Hangul', () => {
    expect(korean.romanize('ㅋㅋ')).toBe('kk');
    expect(korean.romanize('ᅀ')).toBeNull();
  });
});
