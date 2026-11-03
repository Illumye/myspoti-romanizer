/**
 * The scripts the romanizer tells apart in a line. `neutral` stays as it is: Latin letters, digits,
 * punctuation, symbols, spaces. `other` is a letter of a script it does not romanize (Greek,
 * Arabic, Thai...): its line gets no romanization rather than half of one.
 */
export type Script = 'neutral' | 'kana' | 'han' | 'hangul' | 'cyrillic' | 'other';

type Range = readonly [start: number, end: number, script: Script];

// Sorted, inclusive, non-overlapping. A code point in none of them is neutral below Greek (Latin,
// IPA, combining marks) and `other` above it, unless listed here as neutral.
const RANGES: readonly Range[] = [
  [0x0400, 0x052f, 'cyrillic'],
  [0x1100, 0x11ff, 'hangul'], // Jamo
  [0x1c80, 0x1c8f, 'cyrillic'], // Extended-C
  [0x1e00, 0x1eff, 'neutral'], // Latin Extended Additional
  [0x2000, 0x2bff, 'neutral'], // punctuation, symbols, arrows, math, box drawing, dingbats
  [0x2c60, 0x2c7f, 'neutral'], // Latin Extended-C
  [0x2de0, 0x2dff, 'cyrillic'], // Extended-A
  [0x2e00, 0x2e7f, 'neutral'], // supplemental punctuation
  [0x3000, 0x3004, 'neutral'], // ideographic space, 、 。
  [0x3005, 0x3007, 'han'], // 々 〆 〇
  [0x3008, 0x3020, 'neutral'], // 「」『』【】〜 and the other brackets
  [0x3021, 0x3029, 'han'], // Hangzhou numerals
  [0x302a, 0x3030, 'neutral'], // tone marks, 〰
  [0x3031, 0x3035, 'kana'], // vertical kana repeat marks
  [0x3036, 0x3037, 'neutral'],
  [0x3038, 0x303b, 'han'], // Hangzhou numerals, 〻
  [0x303c, 0x303f, 'neutral'], // 〽 marks the start of a song
  [0x3040, 0x309f, 'kana'], // hiragana
  [0x30a0, 0x30a0, 'neutral'], // ゠
  [0x30a1, 0x30fa, 'kana'], // katakana
  [0x30fb, 0x30fb, 'neutral'], // ・ between the words of a foreign name
  [0x30fc, 0x30ff, 'kana'], // ー and the iteration marks
  [0x3130, 0x318f, 'hangul'], // compatibility Jamo
  [0x3190, 0x319f, 'neutral'], // kanbun marks
  [0x31c0, 0x31ef, 'neutral'], // strokes
  [0x31f0, 0x31ff, 'kana'], // small katakana extensions
  [0x3200, 0x33ff, 'neutral'], // enclosed and squared forms left after NFKC
  [0x3400, 0x4dbf, 'han'], // Extension A
  [0x4dc0, 0x4dff, 'neutral'], // hexagrams
  [0x4e00, 0x9fff, 'han'],
  [0xa640, 0xa69f, 'cyrillic'], // Extended-B
  [0xa700, 0xa7ff, 'neutral'], // tone letters, Latin Extended-D
  [0xa960, 0xa97f, 'hangul'], // Jamo Extended-A
  [0xab30, 0xab6f, 'neutral'], // Latin Extended-E
  [0xac00, 0xd7a3, 'hangul'], // syllables
  [0xd7b0, 0xd7ff, 'hangul'], // Jamo Extended-B
  [0xf900, 0xfaff, 'han'], // compatibility ideographs
  [0xfb00, 0xfb06, 'neutral'], // Latin ligatures
  [0xfe00, 0xfe6f, 'neutral'], // variation selectors, vertical and small forms
  [0xff00, 0xff65, 'neutral'], // fullwidth ASCII and punctuation
  [0xff66, 0xff9f, 'kana'], // halfwidth katakana
  [0xffa0, 0xffdc, 'hangul'], // halfwidth Jamo
  [0xffdd, 0xffef, 'neutral'],
  [0x1d000, 0x1d24f, 'neutral'], // musical symbols
  [0x1f000, 0x1faff, 'neutral'], // emoji and pictographs
  [0x20000, 0x323af, 'han'], // Extensions B to H
  [0xe0000, 0xe01ef, 'neutral'], // tags, variation selectors
];

const FIRST_OTHER = 0x0370;

/** The script of code point [cp]. */
export function scriptOf(cp: number): Script {
  let lo = 0;
  let hi = RANGES.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const range = RANGES[mid];
    if (range === undefined) break;
    if (cp < range[0]) hi = mid - 1;
    else if (cp > range[1]) lo = mid + 1;
    else return range[2];
  }
  return cp < FIRST_OTHER ? 'neutral' : 'other';
}
