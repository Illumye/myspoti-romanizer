import { describe, expect, it } from 'vitest';
import { namesOf } from '../../src/domain/names';

describe('namesOf', () => {
  it('gives the words of the title and the artist in Latin letters, each once, as written', () => {
    expect(namesOf({ title: 'Teto Territory', artist: 'Kasane Teto' })).toEqual(['Teto', 'Territory', 'Kasane']);
    expect(namesOf({ title: '砂の惑星 (feat. Hatsune Miku)', artist: 'Kenshi Yonezu' })).toEqual([
      'feat',
      'Hatsune',
      'Miku',
      'Kenshi',
      'Yonezu',
    ]);
  });

  it('leaves out the words shorter than three letters', () => {
    expect(namesOf({ title: 'Ai no Uta', artist: 'Uru' })).toEqual(['Uta', 'Uru']);
  });
});
