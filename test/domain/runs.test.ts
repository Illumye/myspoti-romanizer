import { describe, expect, it } from 'vitest';
import type { SongLanguages } from '../../src/domain/language';
import { languageRuns, scriptRuns } from '../../src/domain/runs';

const japanese: SongLanguages = { han: 'ja', cyrillic: 'ru' };
const chinese: SongLanguages = { han: 'zh', cyrillic: 'ru' };

describe('scriptRuns', () => {
  it('cuts a line where the script changes', () => {
    expect(scriptRuns('I love 君を, 사랑해')).toEqual([
      { script: 'neutral', text: 'I love ' },
      { script: 'han', text: '君' },
      { script: 'kana', text: 'を' },
      { script: 'neutral', text: ', ' },
      { script: 'hangul', text: '사랑해' },
    ]);
  });

  it('keeps an apostrophe between Cyrillic letters and a combining mark in their word', () => {
    expect(scriptRuns("м'ясо")).toEqual([{ script: 'cyrillic', text: "м'ясо" }]);
    expect(scriptRuns('приве́т')).toEqual([{ script: 'cyrillic', text: 'приве́т' }]);
    expect(scriptRuns("ok' я")).toEqual([
      { script: 'neutral', text: "ok' " },
      { script: 'cyrillic', text: 'я' },
    ]);
  });
});

describe('languageRuns', () => {
  it('reads kana and Han side by side as one Japanese phrase', () => {
    expect(languageRuns(scriptRuns('君を愛してる'), chinese)).toEqual([{ language: 'ja', text: '君を愛してる' }]);
  });

  it("reads Han alone in the song's way", () => {
    expect(languageRuns(scriptRuns('永遠'), japanese)).toEqual([{ language: 'ja', text: '永遠' }]);
    expect(languageRuns(scriptRuns('永远'), chinese)).toEqual([{ language: 'zh', text: '永远' }]);
  });

  it('keeps neutral text apart and marks the letters no engine reads', () => {
    expect(languageRuns(scriptRuns('Ἀθήνα, Москва'), japanese)).toEqual([
      { language: 'other', text: 'Ἀθήνα' },
      { language: null, text: ', ' },
      { language: 'ru', text: 'Москва' },
    ]);
  });
});
