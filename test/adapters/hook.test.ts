import { describe, expect, it } from 'vitest';
import type { RomanizeAnswer, RomanizeInput } from '../../src/adapters/myspoti/api';
import { answer, registerRomanizeHook } from '../../src/adapters/myspoti/hook';
import { cyrillic } from '../../src/engines/cyrillic';
import { korean } from '../../src/engines/korean';
import { fakeApi } from './fake-api';

const engines = { ko: korean, ...cyrillic };
const track = { title: 'Title', artist: 'Artist' };

describe('answer', () => {
  it('answers the lines it romanizes, by their index in the song', () => {
    const input: RomanizeInput = {
      track,
      lines: [
        { index: 2, text: '사랑해 너를' },
        { index: 5, text: 'Я тебя люблю' },
        { index: 7, text: '夢ならば' },
      ],
    };
    expect(answer(input, engines)).toEqual({
      lines: [
        { index: 2, romanization: 'saranghae neoreul' },
        { index: 5, romanization: 'Ya tebya lyublyu' },
      ],
    });
  });

  it("follows the lyrics' language when their source gives it", () => {
    const input: RomanizeInput = { track, language: 'uk', lines: [{ index: 0, text: 'гора' }] };
    expect(answer(input, engines)?.lines[0]?.romanization).toBe('hora');
  });

  it('answers null when it has nothing', () => {
    expect(answer({ track, lines: [{ index: 0, text: 'Ἀθήνα' }] }, engines)).toBeNull();
  });

  it('answers with the lines done when its time is up', () => {
    let clock = 0;
    // Each line takes 4 s: the budget of 6 s ends after the second.
    const slow = {
      ko: {
        romanize: (run: string) => {
          clock += 4_000;
          return korean.romanize(run);
        },
      },
    };
    const input: RomanizeInput = {
      track,
      lines: [
        { index: 0, text: '사랑해' },
        { index: 1, text: '같이' },
        { index: 2, text: '신라' },
      ],
    };
    expect(answer(input, slow, () => clock)).toEqual({
      lines: [
        { index: 0, romanization: 'saranghae' },
        { index: 1, romanization: 'gachi' },
      ],
    });
  });
});

describe('registerRomanizeHook', () => {
  it("provides Myspoti's lyrics-romanize hook", () => {
    const { api, provided } = fakeApi();
    registerRomanizeHook(api, engines);
    const hook = provided.get('lyrics-romanize') as (input: RomanizeInput) => RomanizeAnswer | null;
    expect(hook({ track, lines: [{ index: 1, text: '같이' }] })).toEqual({
      lines: [{ index: 1, romanization: 'gachi' }],
    });
  });
});
