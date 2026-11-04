import { DOUBLE, MACRON, SINGLE } from './kana-tables';

const HIRAGANA_FIRST = 0x3041;
const HIRAGANA_LAST = 0x3096;
const TO_KATAKANA = 0x60;

/** [kana] with its hiragana written in katakana, the iteration marks ゝ ゞ as theirs (ヽ ヾ). */
export function toKatakana(kana: string): string {
  let out = '';
  for (let i = 0; i < kana.length; i++) {
    const cp = kana.charCodeAt(i);
    const shifted = (cp >= HIRAGANA_FIRST && cp <= HIRAGANA_LAST) || cp === 0x309d || cp === 0x309e;
    out += shifted ? String.fromCharCode(cp + TO_KATAKANA) : kana.charAt(i);
  }
  return out;
}

/** The kana an iteration mark stands for: the one before it, voiced after ヾ. */
function iterated(mark: string, before: string): string {
  return mark === 'ヾ' ? (before + '゙').normalize('NFC') : before;
}

function isVowel(c: string): boolean {
  return 'aeiou'.includes(c) && c !== '';
}

/**
 * A word's pronunciation in kana, as UniDic writes it (ー for a long vowel: トーキョー), in revised
 * Hepburn: tōkyō, kan'i, matcha, shinbun. Null when it holds anything but kana.
 */
export function hepburn(kana: string): string | null {
  const k = toKatakana(kana);
  let out = '';
  let doubled = false;
  let previous = '';
  for (let i = 0; i < k.length;) {
    let c = k.charAt(i);
    if (c === 'ヽ' || c === 'ヾ') c = iterated(c, previous);
    if (c === 'ッ') {
      doubled = true;
      i++;
      continue;
    }
    if (c === 'ー') {
      const last = out.charAt(out.length - 1);
      const long = MACRON[last];
      if (long !== undefined) out = out.slice(0, -1) + long;
      i++;
      continue;
    }
    const pair = DOUBLE[c + k.charAt(i + 1)];
    const syllable = pair ?? SINGLE[c];
    if (syllable === undefined) return null;
    // ン before a vowel or y is n', so that kan'i is not kani.
    if (previous === 'ン' && (isVowel(syllable.charAt(0)) || syllable.startsWith('y'))) out += "'";
    if (doubled && !isVowel(syllable.charAt(0)) && syllable !== 'n')
      out += syllable.startsWith('ch') ? 't' : syllable.charAt(0);
    doubled = false;
    out += syllable;
    previous = c;
    i += pair === undefined ? 1 : 2;
  }
  return out;
}
