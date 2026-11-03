/** The track every hook receives (docs/extensions/API.md, section 3). */
export interface Track {
  readonly id: string;
  readonly uri: string;
  readonly title: string;
  readonly artist: string;
  readonly album: string;
  readonly durationMs: number;
}

/** A line Myspoti asks a romanization for, by its index in the song's lyrics. */
export interface AskedLine {
  readonly index: number;
  readonly text: string;
}

/** The input of the `lyrics-romanize` hook. */
export interface RomanizeInput {
  readonly track: Pick<Track, 'title' | 'artist'>;
  /** The lyrics' language, when their source says it ("ja", "uk-UA"). */
  readonly language?: string;
  readonly lines: readonly AskedLine[];
}

/** The answer of the `lyrics-romanize` hook: the romanizations found, by index. */
export interface RomanizeAnswer {
  readonly lines: readonly { readonly index: number; readonly romanization: string }[];
}

/** A line of the `lyrics` hook's answer: its time in ms (0 when not synced), text and romanization. */
export interface LyricsLine {
  readonly time: number;
  readonly end?: number;
  readonly text: string;
  readonly romanization?: string;
}

/** The answer of the `lyrics` hook. */
export interface LyricsAnswer {
  readonly synced: boolean;
  readonly lines: readonly LyricsLine[];
}

/** Spotify's own lyrics, as `myspoti.spotify.extras.lyrics` returns them (section 6.2). */
export interface SpotifyLyrics {
  readonly lines: readonly { readonly startMs: number; readonly endMs?: number; readonly text: string }[];
  readonly synced: boolean;
  readonly language?: string;
}

/** A response of `myspoti.http` (section 5). */
export interface HttpResponse {
  readonly status: number;
  readonly ok: boolean;
  json(): unknown;
}

/** The part of Myspoti's `myspoti` object this extension uses (docs/extensions/API.md, section 5). */
export interface MyspotiApi {
  /** What this Myspoti understands beyond the first API; missing on an older one. */
  readonly features?: readonly string[];
  provide(hook: 'lyrics-romanize', answer: (input: RomanizeInput) => RomanizeAnswer | null): void;
  provide(hook: 'lyrics', answer: (track: Track) => LyricsAnswer | null): void;
  readonly query?: (params: Readonly<Record<string, string | number | undefined>>) => string;
  readonly http?: { get(url: string, options?: { readonly timeout?: number }): HttpResponse };
  readonly spotify?: { readonly extras: { lyrics(trackUri: string): SpotifyLyrics | null } };
  log(...values: unknown[]): void;
}
