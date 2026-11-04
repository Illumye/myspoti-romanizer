import { describe, expect, it } from 'vitest';
import type { Engines, Romanizer } from '../../src/domain/romanizer';
import { romanizeSong } from '../../src/domain/song';

// Fake engines: in Latin letters only, as a real one writes what it reads, their language and the
// length of the run they were given; nothing for the runs they are told not to know.
const fake = (tag: string, unknown = ''): Romanizer => ({
  romanize: (run) => (unknown !== '' && run.includes(unknown) ? null : `${tag}(${String(run.length)})`),
});
const engines: Engines = { ja: fake('ja', '謎'), ko: fake('ko'), ru: fake('ru'), uk: fake('uk') };

const song = (...lines: string[]) => new Map(lines.map((text, index) => [index, text]));

describe('romanizeSong', () => {
  it('romanizes each line whole, by index, and leaves the others out', () => {
    expect(romanizeSong(song('Intro', '君を愛してる', '♪', '사랑해'), engines)).toEqual(
      new Map([
        [1, 'ja(6)'],
        [3, 'ko(3)'],
      ]),
    );
  });

  it('keeps Latin words and punctuation around the romanized ones', () => {
    expect(romanizeSong(song('I love 君を!'), engines).get(0)).toBe('I love ja(2)!');
  });

  it('keeps what no engine reads as it is written, unless that is more than a quarter of the line', () => {
    expect(romanizeSong(song('君を愛してる Ἀθ'), engines, { language: 'ja' }).get(0)).toBe('ja(6) Ἀθ');
    expect(romanizeSong(song('Ἀθήνα 君'), engines).size).toBe(0);
    expect(romanizeSong(song('君と謎'), engines).size).toBe(0);
    expect(romanizeSong(song('永远'), engines).size).toBe(0);
  });

  it("gives the engines the names the song's title and artist write", () => {
    const seen: (readonly string[])[] = [];
    const recorder: Romanizer = {
      romanize: (_run, song) => {
        seen.push(song?.names ?? []);
        return 'x';
      },
    };
    const track = { title: 'Teto Territory', artist: 'Kasane Teto' };
    romanizeSong(song('君'), { ja: recorder }, { language: 'ja', track });
    expect(seen).toEqual([['Teto', 'Territory', 'Kasane']]);
  });

  it('reads compatibility forms as their usual letters', () => {
    expect(romanizeSong(song('ｶﾗｵｹ'), engines).get(0)).toBe('ja(4)');
    expect(romanizeSong(song('２０歳'), engines, { language: 'ja' }).get(0)).toBe('ja(3)');
  });

  it("reads the song's Cyrillic as the source says, else as its letters show", () => {
    expect(romanizeSong(song('гора'), engines).get(0)).toBe('ru(4)');
    expect(romanizeSong(song('гора'), engines, { language: 'uk' }).get(0)).toBe('uk(4)');
    expect(romanizeSong(song('гора', 'Київ'), engines).get(0)).toBe('uk(4)');
  });
});
