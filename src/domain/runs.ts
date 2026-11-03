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

/**
 * [runs] as they are read in a song of [languages]. Kana and Han side by side are one phrase,
 * Japanese when it holds kana or the song is Japanese, Chinese otherwise. Digits that touch a
 * phrase are read with it, as a number is said with its counter (20歳, あと3秒).
 */
export function languageRuns(runs: readonly ScriptRun[], languages: SongLanguages): LanguageRun[] {
  const out: LanguageRun[] = [];
  let phrase: { text: string; kana: boolean } | undefined;
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (run === undefined) break;
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
