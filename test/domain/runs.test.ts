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

  it('reads digits with the phrase they touch, and keeps the others apart', () => {
    expect(languageRuns(scriptRuns('20歳の夏'), japanese)).toEqual([{ language: 'ja', text: '20歳の夏' }]);
    expect(languageRuns(scriptRuns('あと3 秒'), japanese)).toEqual([
      { language: 'ja', text: 'あと3' },
      { language: null, text: ' ' },
      { language: 'ja', text: '秒' },
    ]);
    expect(languageRuns(scriptRuns('2024'), japanese)).toEqual([{ language: null, text: '2024' }]);
    expect(languageRuns(scriptRuns('20살'), japanese)).toEqual([
      { language: null, text: '20' },
      { language: 'ko', text: '살' },
    ]);
  });

  it('reads a word spelled out kana by kana as one run, and a name with a dot as two', () => {
    expect(languageRuns(scriptRuns('は・や・く'), japanese)).toEqual([{ language: 'ja', text: 'は・や・く' }]);
    expect(languageRuns(scriptRuns('は や く!'), chinese)).toEqual([
      { language: 'ja', text: 'は や く' },
      { language: null, text: '!' },
    ]);
    expect(languageRuns(scriptRuns('ロミオ・ジュリエット'), japanese)).toEqual([
      { language: 'ja', text: 'ロミオ' },
      { language: null, text: '・' },
      { language: 'ja', text: 'ジュリエット' },
    ]);
    expect(languageRuns(scriptRuns('君は・や・く'), japanese)).toEqual([
      { language: 'ja', text: '君は' },
      { language: null, text: '・' },
      { language: 'ja', text: 'や' },
      { language: null, text: '・' },
      { language: 'ja', text: 'く' },
    ]);
  });

  it('keeps neutral text apart and marks the letters no engine reads', () => {
    expect(languageRuns(scriptRuns('Ἀθήνα, Москва'), japanese)).toEqual([
      { language: 'other', text: 'Ἀθήνα' },
      { language: null, text: ', ' },
      { language: 'ru', text: 'Москва' },
    ]);
  });
});
