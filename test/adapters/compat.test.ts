import { describe, expect, it } from 'vitest';
import type { HttpResponse, LyricsAnswer, SpotifyLyrics, Track } from '../../src/adapters/myspoti/api';
import { answerLyrics, registerLyricsHook } from '../../src/adapters/myspoti/compat';
import { cyrillic } from '../../src/engines/cyrillic';
import { japanese } from '../../src/engines/japanese';
import { korean } from '../../src/engines/korean';
import { fakeApi } from './fake-api';

const engines = { ja: japanese, ko: korean, ...cyrillic };
const track: Track = { id: 'id1', uri: 'spotify:track:id1', title: 'T', artist: 'A', album: 'B', durationMs: 200_000 };

const spotify = (lyrics: SpotifyLyrics | null) => ({ extras: { lyrics: () => lyrics } });
const http = (status: number, body: unknown) => ({
  get: (): HttpResponse => ({ status, ok: status < 300, json: () => body }),
});

describe('answerLyrics', () => {
  it("romanizes Spotify's own lines, the ones Myspoti shows", () => {
    const { api } = fakeApi({
      spotify: spotify({
        synced: true,
        language: 'ja',
        lines: [
          { startMs: 1000, text: 'Intro' },
          { startMs: 2000, endMs: 4000, text: '君を愛してる' },
        ],
      }),
    });
    expect(answerLyrics(api, track, engines)).toEqual({
      synced: true,
      lines: [
        { time: 1000, text: 'Intro' },
        { time: 2000, end: 4000, text: '君を愛してる', romanization: 'kimi o aishiteru' },
      ],
    });
  });

  it("falls back on LRCLIB's lyrics when Spotify cannot be asked", () => {
    const { api, logs } = fakeApi({
      spotify: {
        extras: {
          lyrics: () => {
            throw new Error('not signed in');
          },
        },
      },
      http: http(200, { syncedLyrics: '[00:01.00]사랑해 너를' }),
    });
    expect(answerLyrics(api, track, engines)?.lines).toEqual([
      { time: 1000, text: '사랑해 너를', romanization: 'saranghae neoreul' },
    ]);
    expect(logs).toEqual(['Spotify lyrics: Error: not signed in']);
  });

  it('stays out of a song with nothing to romanize, or no lyrics at all', () => {
    const latin = fakeApi({ spotify: spotify({ synced: false, lines: [{ startMs: 0, text: 'Hello' }] }) });
    expect(answerLyrics(latin.api, track, engines)).toBeNull();
    const none = fakeApi({ spotify: spotify(null), http: http(404, {}) });
    expect(answerLyrics(none.api, track, engines)).toBeNull();
  });
});

describe('registerLyricsHook', () => {
  it("provides Myspoti's lyrics hook", () => {
    const { api, provided } = fakeApi({ http: http(200, { plainLyrics: 'Привет' }) });
    registerLyricsHook(api, engines);
    const hook = provided.get('lyrics') as (input: Track) => LyricsAnswer | null;
    expect(hook({ ...track, uri: '' })).toEqual({
      synced: false,
      lines: [{ time: 0, text: 'Привет', romanization: 'Privet' }],
    });
  });
});
