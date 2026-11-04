import type { Engines } from '../../domain/romanizer';
import { romanizeSong } from '../../domain/song';
import type { LyricsAnswer, MyspotiApi, Track } from './api';
import { TIME_BUDGET_MS } from './hook';
import { lyricsOf } from './sources';

/**
 * The answer to the `lyrics` hook, for a Myspoti without the `lyrics-romanize` one: the song's
 * lyrics as its source gives them, with a romanization on the lines [engines] can write. Myspoti
 * matches them by text to the lyrics it shows and keeps the romanizations. Null when the lyrics
 * have nothing to romanize: the extension then stays out of the song's sources.
 */
export function answerLyrics(
  api: MyspotiApi,
  track: Track,
  engines: Engines,
  now: () => number = Date.now,
): LyricsAnswer | null {
  const deadline = now() + TIME_BUDGET_MS;
  const lyrics = lyricsOf(api, track);
  if (lyrics === null) return null;
  const texts = new Map<number, string>();
  lyrics.lines.forEach((line, index) => texts.set(index, line.text));
  const found = romanizeSong(texts, engines, {
    language: lyrics.language,
    track,
    shouldStop: () => now() > deadline,
  });
  if (found.size === 0) return null;
  const lines = lyrics.lines.map((line, index) => {
    const romanization = found.get(index);
    return romanization === undefined ? line : { ...line, romanization };
  });
  return { synced: lyrics.synced, lines };
}

/** Answers Myspoti's `lyrics` hook with [engines]. */
export function registerLyricsHook(api: MyspotiApi, engines: Engines): void {
  api.provide('lyrics', (track) => answerLyrics(api, track, engines));
}
