import type { Engines } from '../../domain/romanizer';
import { romanizeSong } from '../../domain/song';
import type { MyspotiApi, RomanizeAnswer, RomanizeInput } from './api';

// Myspoti gives a call 8 s (docs/extensions/API.md, section 7) and abandons one that runs over:
// stopping before, with the lines done, keeps them. Myspoti asks again for the others later.
export const TIME_BUDGET_MS = 6_000;

/** The answer to [input]: the romanizations [engines] can write within the time budget, or null. */
export function answer(input: RomanizeInput, engines: Engines, now: () => number = Date.now): RomanizeAnswer | null {
  const deadline = now() + TIME_BUDGET_MS;
  const lines = new Map<number, string>();
  for (const line of input.lines) lines.set(line.index, line.text);
  const found = romanizeSong(lines, engines, input.language, () => now() > deadline);
  if (found.size === 0) return null;
  return { lines: Array.from(found, ([index, romanization]) => ({ index, romanization })) };
}

/** Answers Myspoti's `lyrics-romanize` hook with [engines]. */
export function registerRomanizeHook(api: MyspotiApi, engines: Engines): void {
  api.provide('lyrics-romanize', (input) => answer(input, engines));
}
