import { romanize } from 'es-hangul';
import type { Romanizer } from '../domain/romanizer';
import { scriptOf } from '../domain/script';
import { codePointAt, unitsOf } from '../domain/text';

function hasHangul(text: string): boolean {
  for (let i = 0; i < text.length;) {
    const cp = codePointAt(text, i);
    if (scriptOf(cp) === 'hangul') return true;
    i += unitsOf(cp);
  }
  return false;
}

/**
 * Korean in the Revised Romanization of 2000, after the standard pronunciation rules (liaison,
 * assimilation, palatalization), by es-hangul: 같이 is "gachi", 신라 "silla", 국물 "gungmul".
 */
export const korean: Romanizer = {
  romanize(run) {
    const latin = romanize(run);
    // What es-hangul leaves in Hangul (archaic Jamo such as ᅀ) has no reading of its own.
    return hasHangul(latin) ? null : latin;
  },
};
