import type { Language } from './language';

/** What a song gives the engines reading its lines: the names its title and artist write in Latin letters. */
export interface SongContext {
  readonly names: readonly string[];
}

/**
 * Writes a run of one language in Latin letters, what it cannot read kept as it is written; null
 * when it cannot read the run at all. [song]: the song the run is sung in, for the names it sings.
 */
export interface Romanizer {
  romanize(run: string, song?: SongContext): string | null;
}

/** The romanizers by language; a language without one leaves its lines without a romanization. */
export type Engines = Readonly<Partial<Record<Language, Romanizer>>>;
