import type { LyricsLine } from './api';

// [mm:ss], [mm:ss.xx] or [mm:ss:xx] before a line, several when the line is sung several times.
const STAMP = /^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/;

function milliseconds(minutes: string, seconds: string, fraction: string | undefined): number {
  const part = fraction === undefined ? 0 : Number((fraction + '00').slice(0, 3));
  return (Number(minutes) * 60 + Number(seconds)) * 1000 + part;
}

/**
 * The lines of LRC lyrics in time order; a line sung at several times comes once per time.
 * Metadata tags ([ar:...]) and lines without a time are left out.
 */
export function parseLrc(lrc: string): LyricsLine[] {
  const lines: LyricsLine[] = [];
  for (const raw of lrc.split('\n')) {
    let rest = raw.trim();
    const times: number[] = [];
    for (let stamp = STAMP.exec(rest); stamp !== null; stamp = STAMP.exec(rest)) {
      times.push(milliseconds(stamp[1] ?? '0', stamp[2] ?? '0', stamp[3]));
      rest = rest.slice(stamp[0].length);
    }
    for (const time of times) lines.push({ time, text: rest.trim() });
  }
  return lines.sort((a, b) => a.time - b.time);
}

/** Lyrics without times, one line per row. */
export function parsePlain(text: string): LyricsLine[] {
  return text.split('\n').map((line) => ({ time: 0, text: line.trim() }));
}
