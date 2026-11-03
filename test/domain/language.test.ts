import { describe, expect, it } from 'vitest';
import { cyrillicLanguageOf, songLanguages } from '../../src/domain/language';

describe('cyrillicLanguageOf', () => {
  it.each([
    ['я тебя люблю', 'ru'],
    ['київ їжак', 'uk'],
    ['привіт світ', 'uk'],
    ['мінск беларусь ў', 'be'],
    ['вы і мы', 'be'],
    ['ђорђе', 'sr'],
    ['љубав', 'sr'],
    ['ќерка', 'mk'],
    ['път сърце', 'bg'],
    ['объявление', 'ru'],
  ] as const)('reads "%s" as %s', (letters, language) => {
    expect(cyrillicLanguageOf(letters)).toBe(language);
  });
});

describe('songLanguages', () => {
  it('reads Han as Japanese when the song has kana anywhere', () => {
    expect(songLanguages(['永遠', '君を愛してる']).han).toBe('ja');
  });

  it('reads Han as Chinese in a song without kana', () => {
    expect(songLanguages(['我爱你', '永远']).han).toBe('zh');
  });

  it("follows the source's language first, region apart", () => {
    expect(songLanguages(['永遠'], 'ja-JP').han).toBe('ja');
    expect(songLanguages(['君を'], 'zh-Hant').han).toBe('zh');
    expect(songLanguages(['гора'], 'uk').cyrillic).toBe('uk');
    expect(songLanguages(['гора']).cyrillic).toBe('ru');
  });

  it('reads the Cyrillic language from the whole song', () => {
    expect(songLanguages(['Гора', 'Київ']).cyrillic).toBe('uk');
  });
});
