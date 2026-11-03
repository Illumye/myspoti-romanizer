import { describe, expect, it } from 'vitest';
import type { Engines, Romanizer } from '../../src/domain/romanizer';
import { romanizeSong } from '../../src/domain/song';

// Fake engines: the run in brackets, or nothing for the runs they are told not to know.
const fake = (tag: string, unknown = ''): Romanizer => ({
  romanize: (run) => (unknown !== '' && run.includes(unknown) ? null : `${tag}(${run})`),
});
const engines: Engines = { ja: fake('ja', '謎'), ko: fake('ko'), ru: fake('ru'), uk: fake('uk') };

const song = (...lines: string[]) => new Map(lines.map((text, index) => [index, text]));

describe('romanizeSong', () => {
  it('romanizes each line whole, by index, and leaves the others out', () => {
    expect(romanizeSong(song('Intro', '君を愛してる', '♪', '사랑해'), engines)).toEqual(
      new Map([
        [1, 'ja(君を愛してる)'],
        [3, 'ko(사랑해)'],
      ]),
    );
  });

  it('keeps Latin words and punctuation around the romanized ones', () => {
    expect(romanizeSong(song('I love 君を!'), engines).get(0)).toBe('I love ja(君を)!');
  });

  it('gives a line no romanization rather than half of one', () => {
    expect(romanizeSong(song('Ἀθήνα 君'), engines).size).toBe(0);
    expect(romanizeSong(song('君と謎'), engines).size).toBe(0);
    expect(romanizeSong(song('永远'), engines).size).toBe(0);
  });

  it('reads compatibility forms as their usual letters', () => {
    expect(romanizeSong(song('ｶﾗｵｹ'), engines).get(0)).toBe('ja(カラオケ)');
  });

  it("reads the song's Cyrillic as the source says, else as its letters show", () => {
    expect(romanizeSong(song('гора'), engines).get(0)).toBe('ru(гора)');
    expect(romanizeSong(song('гора'), engines, 'uk').get(0)).toBe('uk(гора)');
    expect(romanizeSong(song('гора', 'Київ'), engines).get(0)).toBe('uk(гора)');
  });
});
