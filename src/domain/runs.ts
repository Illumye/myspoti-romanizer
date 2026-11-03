import type { Language, SongLanguages } from './language';
import { scriptOf, type Script } from './script';
import { codePointAt, isCombining, unitsOf } from './text';

/** A piece of a line in one script. */
export interface ScriptRun {
  readonly script: Script;
  readonly text: string;
}

/**
 * A piece of a line as it is romanized: the [language] an engine reads it in, null for text kept as
 * it is, `other` for letters no engine reads.
 */
export interface LanguageRun {
  readonly language: Language | 'other' | null;
  readonly text: string;
}

const APOSTROPHES = new Set([0x27, 0x2bc, 0x2019]);

/**
 * [line] cut where the script changes. A combining mark stays with the letter before it, and an
 * apostrophe between two Cyrillic letters stays in the word (Ukrainian м'ясо is one word).
 */
export function scriptRuns(line: string): ScriptRun[] {
  const runs: ScriptRun[] = [];
  let current: Script | undefined;
  let start = 0;
  for (let i = 0; i < line.length;) {
    const cp = codePointAt(line, i);
    const width = unitsOf(cp);
    const inWord =
      current === 'cyrillic' && APOSTROPHES.has(cp) && scriptOf(codePointAt(line, i + width)) === 'cyrillic';
    const script = current !== undefined && (isCombining(cp) || inWord) ? current : scriptOf(cp);
    if (script !== current) {
      if (current !== undefined) runs.push({ script: current, text: line.slice(start, i) });
      current = script;
      start = i;
    }
    i += width;
  }
  if (current !== undefined) runs.push({ script: current, text: line.slice(start) });
  return runs;
}

function languageOf(script: Script, languages: SongLanguages): LanguageRun['language'] {
  switch (script) {
    case 'neutral':
    case 'digit':
      return null;
    case 'kana':
      return 'ja';
    case 'han':
      return languages.han;
    case 'hangul':
      return 'ko';
    case 'cyrillic':
      return languages.cyrillic;
    case 'other':
      return 'other';
  }
}

function isPhrase(run: ScriptRun | undefined): boolean {
  return run !== undefined && (run.script === 'kana' || run.script === 'han');
}

// A word spelled out kana by kana, a separator between each two and this many kana at least
// (は・や・く): read as one run, so that its engine reads the word they spell. A name with a dot
// between its words (ロミオ・ジュリエット) has more than a kana between two.
const SPELLING_SEPARATORS = new Set(['・', ' ']);
const MIN_SPELLED = 3;

function isLoneKana(run: ScriptRun | undefined): boolean {
  return run?.script === 'kana' && run.text.length === 1;
}

function isSpellingSeparator(run: ScriptRun | undefined): boolean {
  return run !== undefined && SPELLING_SEPARATORS.has(run.text);
}

/** How many of [runs] from [from] spell a word out kana by kana (は, ・, や, ・, く), or 0. */
function spelledFrom(runs: readonly ScriptRun[], from: number): number {
  if (!isLoneKana(runs[from]) || isPhrase(runs[from - 1])) return 0;
  let end = from + 1;
  let kana = 1;
  while (isSpellingSeparator(runs[end]) && isLoneKana(runs[end + 1])) {
    end += 2;
    kana++;
  }
  return kana >= MIN_SPELLED && !isPhrase(runs[end]) ? end - from : 0;
}

/**
 * [runs] as they are read in a song of [languages]. Kana and Han side by side are one phrase,
 * Japanese when it holds kana or the song is Japanese, Chinese otherwise. Digits that touch a
 * phrase are read with it, as a number is said with its counter (20歳, あと3秒), and a word spelled
 * out kana by kana is one Japanese run, its separators in it (は・や・く).
 */
export function languageRuns(runs: readonly ScriptRun[], languages: SongLanguages): LanguageRun[] {
  const out: LanguageRun[] = [];
  let phrase: { text: string; kana: boolean } | undefined;
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (run === undefined) break;
    const spelled = phrase === undefined ? spelledFrom(runs, i) : 0;
    if (spelled > 0) {
      out.push({
        language: 'ja',
        text: runs
          .slice(i, i + spelled)
          .map((r) => r.text)
          .join(''),
      });
      i += spelled - 1;
      continue;
    }
    if (isPhrase(run) || (run.script === 'digit' && (phrase !== undefined || isPhrase(runs[i + 1])))) {
      phrase = { text: (phrase?.text ?? '') + run.text, kana: (phrase?.kana ?? false) || run.script === 'kana' };
      continue;
    }
    if (phrase) out.push({ language: phrase.kana ? 'ja' : languages.han, text: phrase.text });
    phrase = undefined;
    out.push({ language: languageOf(run.script, languages), text: run.text });
  }
  if (phrase) out.push({ language: phrase.kana ? 'ja' : languages.han, text: phrase.text });
  return out;
}
