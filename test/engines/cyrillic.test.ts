import { describe, expect, it } from 'vitest';
import type { CyrillicLanguage } from '../../src/domain/language';
import { cyrillic } from '../../src/engines/cyrillic';

// The examples each system's own text gives, and the cases where a letter depends on its place.
const cases: readonly (readonly [CyrillicLanguage, string, string])[] = [
  ['ru', 'Привет', 'Privet'],
  ['ru', 'Елена', 'Yelena'],
  ['ru', 'её', 'yeyo'],
  ['ru', 'объявление', 'obyavleniye'],
  ['ru', 'Щука', 'Shchuka'],
  ['ru', 'всё', 'vsyo'],
  ['ru', 'любовь', 'lyubov'],
  ['ru', 'Я', 'Ya'],
  ['ru', 'ЖИЗНЬ', 'ZHIZN'],
  ['uk', 'Київ', 'Kyiv'],
  ['uk', 'Їжакевич', 'Yizhakevych'],
  ['uk', 'Згорани', 'Zghorany'],
  ['uk', 'Юрій', 'Yurii'],
  ['uk', 'Україна', 'Ukraina'],
  ['uk', "м'ясо", 'miaso'],
  ['uk', 'Євген', 'Yevhen'],
  ['uk', 'Щастя', 'Shchastia'],
  ['be', 'Беларусь', 'Belarus'],
  ['be', 'Мінск', 'Minsk'],
  ['be', 'Магілёў', 'Mahilyow'],
  ['bg', 'Сърце', 'Sartse'],
  ['bg', 'София', 'Sofia'],
  ['bg', 'Щастие', 'Shtastie'],
  ['bg', 'Юлия', 'Yulia'],
  ['sr', 'Ђорђе', 'Đorđe'],
  ['sr', 'Љубав', 'Ljubav'],
  ['sr', 'ЊЕГОШ', 'NJEGOŠ'],
  ['sr', 'Џеп', 'Džep'],
  ['mk', 'Ѓорѓи', 'Gjorgji'],
  ['mk', 'Ќерка', 'Kjerka'],
  ['mk', 'Ѕвезда', 'Dzvezda'],
  ['mk', 'Џеб', 'Dzheb'],
];

describe('cyrillic', () => {
  it.each(cases)('%s writes %s as %s', (language, word, latin) => {
    expect(cyrillic[language].romanize(word)).toBe(latin);
  });

  it('gives nothing for a word with a letter outside the alphabet', () => {
    expect(cyrillic.ru.romanize('Магілёў')).toBeNull();
    expect(cyrillic.sr.romanize('щука')).toBeNull();
  });

  it('keeps a stress mark', () => {
    expect(cyrillic.ru.romanize('приве́т')).toBe('privét');
  });
});
