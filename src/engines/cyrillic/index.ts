import type { CyrillicLanguage } from '../../domain/language';
import type { Romanizer } from '../../domain/romanizer';
import { BELARUSIAN, BULGARIAN, MACEDONIAN, RUSSIAN, SERBIAN, UKRAINIAN, type CyrillicSystem } from './systems';
import { transliterate } from './transliterate';

function romanizer(system: CyrillicSystem): Romanizer {
  return { romanize: (run) => transliterate(run, system) };
}

/** One romanizer per Cyrillic language, each with its own system. */
export const cyrillic: Readonly<Record<CyrillicLanguage, Romanizer>> = {
  ru: romanizer(RUSSIAN),
  uk: romanizer(UKRAINIAN),
  be: romanizer(BELARUSIAN),
  bg: romanizer(BULGARIAN),
  sr: romanizer(SERBIAN),
  mk: romanizer(MACEDONIAN),
};
