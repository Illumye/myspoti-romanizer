import { hepburn } from './hepburn';
import { tokenize } from './lattice';

/**
 * A word spelled out kana by kana (は・や・く), read whole, so that each kana takes the sound it has
 * in the word and not the one it has alone (ha, not the particle wa), then written kana by kana as
 * it is spelled: ha ya ku. A kana the word read whole makes a word of its own keeps that word's
 * reading (わ・た・し・は: the particle は is wa).
 */
export function romanizeSpelled(run: string): string {
  const kana = run.replace(/[・ ]/g, '');
  const own = new Map<number, string>();
  let at = 0;
  for (const token of tokenize(kana)) {
    if (token.surface.length === 1 && token.reading !== '') own.set(at, token.reading);
    at += token.surface.length;
  }
  const out: string[] = [];
  for (let i = 0; i < kana.length; i++) {
    const c = kana.charAt(i);
    // A kana with no sound alone (っ, ー) stays as it is written.
    const latin = hepburn(own.get(i) ?? c);
    out.push(latin === null || latin === '' ? c : latin);
  }
  return out.join(' ');
}
