import type { Language } from './language';

/** Writes a run of one language in Latin letters: all of it, or null when it cannot read all of it. */
export interface Romanizer {
  romanize(run: string): string | null;
}

/** The romanizers by language; a language without one leaves its lines without a romanization. */
export type Engines = Readonly<Partial<Record<Language, Romanizer>>>;
