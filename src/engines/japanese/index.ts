import type { Romanizer } from '../../domain/romanizer';
import { tokenize } from './lattice';
import { namesIn } from './names';
import { romanizeSpelled } from './spelled';
import { romanizeTokens } from './words';

// A chorus comes back several times in a song, and the engine stays loaded between songs.
const CACHE_LIMIT = 5_000;
const cache = new Map<string, string | null>();

/**
 * Japanese in revised Hepburn: the run cut into words and read with a lexicon distilled from
 * UniDic (tools/japanese), as MeCab would read it, offline; the names the song's title and artist
 * spell read as they spell them.
 */
export const japanese: Romanizer = {
  romanize(run, song) {
    const names = song?.names ?? [];
    const key = names.length === 0 ? run : `${run}\u0000${names.join(' ')}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    // A run with separators in it is a word spelled out kana by kana: no other comes so (runs.ts).
    const latin =
      run.includes('・') || run.includes(' ')
        ? romanizeSpelled(run)
        : romanizeTokens(tokenize(run, names.length === 0 ? [] : namesIn(run, names)));
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(key, latin);
    return latin;
  },
};
