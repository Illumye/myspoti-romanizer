import type { LyricsLine, MyspotiApi, Track } from './api';
import { parseLrc, parsePlain } from './lrc';

/** A song's lyrics as a source gives them, before they are romanized. */
export interface SourceLyrics {
  readonly synced: boolean;
  readonly language?: string;
  readonly lines: readonly LyricsLine[];
}

/** A text field of an answer read as JSON, or undefined when it is anything else. */
function textField(value: unknown, field: string): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const text: unknown = (value as Record<string, unknown>)[field];
  return typeof text === 'string' && text.trim() !== '' ? text : undefined;
}

/**
 * Spotify's own lyrics of [track]: the very lines Myspoti shows when they are Spotify's, so the
 * romanizations meet them line for line. Null when Spotify has none or cannot be asked.
 */
function fromSpotify(api: MyspotiApi, track: Track): SourceLyrics | null {
  if (api.spotify === undefined || track.uri === '') return null;
  try {
    const lyrics = api.spotify.extras.lyrics(track.uri);
    if (lyrics === null || lyrics.lines.length === 0) return null;
    const lines = lyrics.lines.map((l) => ({ time: l.startMs, ...(l.endMs ? { end: l.endMs } : {}), text: l.text }));
    return { synced: lyrics.synced, lines, ...(lyrics.language ? { language: lyrics.language } : {}) };
  } catch (error) {
    api.log('Spotify lyrics:', String(error));
    return null;
  }
}

/** LRCLIB's lyrics of [track]: the ones Myspoti shows when Spotify has none. */
function fromLrclib(api: MyspotiApi, track: Track): SourceLyrics | null {
  if (api.http === undefined || api.query === undefined) return null;
  const query = api.query({
    track_name: track.title,
    artist_name: track.artist,
    album_name: track.album || undefined,
    duration: track.durationMs > 0 ? Math.round(track.durationMs / 1000) : undefined,
  });
  const response = api.http.get(`https://lrclib.net/api/get?${query}`, { timeout: 4000 });
  if (!response.ok) return null;
  const found = response.json();
  const synced = textField(found, 'syncedLyrics');
  if (synced !== undefined) return { synced: true, lines: parseLrc(synced) };
  const plain = textField(found, 'plainLyrics');
  return plain === undefined ? null : { synced: false, lines: parsePlain(plain) };
}

/** [track]'s lyrics: Spotify's first, else LRCLIB's; null when neither has them. */
export function lyricsOf(api: MyspotiApi, track: Track): SourceLyrics | null {
  return fromSpotify(api, track) ?? fromLrclib(api, track);
}
