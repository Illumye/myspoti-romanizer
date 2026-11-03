import type { Romanizer } from '../../domain/romanizer';
import { tokenize } from './lattice';
import { romanizeTokens } from './words';

// A chorus comes back several times in a song, and the engine stays loaded between songs.
const CACHE_LIMIT = 5_000;
const cache = new Map<string, string | null>();

/**
 * Japanese in revised Hepburn: the run cut into words and read with a lexicon distilled from
 * UniDic (tools/japanese), as MeCab would read it, offline.
 */
export const japanese: Romanizer = {
  romanize(run) {
    const cached = cache.get(run);
    if (cached !== undefined) return cached;
    const latin = romanizeTokens(tokenize(run));
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(run, latin);
    return latin;
  },
};
