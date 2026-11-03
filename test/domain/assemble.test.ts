import { describe, expect, it } from 'vitest';
import { assemble } from '../../src/domain/assemble';

const latin = (text: string) => ({ romanized: true, text });
const kept = (text: string) => ({ romanized: false, text });

describe('assemble', () => {
  it('writes East Asian punctuation in its Latin form', () => {
    expect(assemble([latin('kimi'), kept('、'), latin('boku'), kept('。')])).toBe('kimi, boku.');
    expect(assemble([kept('「'), latin('kimi'), kept('」')])).toBe('"kimi"');
  });

  it('puts a space between two words that meet where two parts join', () => {
    expect(assemble([kept('I love'), latin('kimi wo')])).toBe('I love kimi wo');
    expect(assemble([latin('saranghae'), latin('aishiteru')])).toBe('saranghae aishiteru');
    expect(assemble([latin('kimi'), kept('!'), latin('boku')])).toBe('kimi! boku');
    expect(assemble([kept('('), latin('kimi'), kept(')')])).toBe('(kimi)');
  });

  it('keeps one space at most, none before closing punctuation', () => {
    expect(assemble([kept('  '), latin('kimi'), kept(' 、 '), latin('boku'), kept(' ')])).toBe('kimi, boku');
  });
});
