import type { Language } from './language';

/**
 * Writes a run of one language in Latin letters, what it cannot read kept as it is written; null
 * when it cannot read the run at all.
 */
export interface Romanizer {
  romanize(run: string): string | null;
}

/** The romanizers by language; a language without one leaves its lines without a romanization. */
export type Engines = Readonly<Partial<Record<Language, Romanizer>>>;
