# Lyrics Romanizer for Myspoti

A [Myspoti](https://github.com/kota-zo/myspoti) extension that writes lyrics in Korean and Cyrillic
scripts in Latin letters, offline, under each line of the songs whose lyrics come without a
romanization. A romanization the lyrics' source gives (Apple Music, NetEase) always comes first.

## What it romanizes

| Language   | System                                                              |
| ---------- | ------------------------------------------------------------------- |
| Korean     | Revised Romanization (2000), after the standard pronunciation rules |
| Russian    | BGN/PCGN, without diacritics                                        |
| Ukrainian  | National system (2010)                                              |
| Belarusian | BGN/PCGN, without diacritics                                        |
| Bulgarian  | Streamlined System (2009)                                           |
| Serbian    | Serbian Latin alphabet                                              |
| Macedonian | Official system (2008)                                              |

A line is romanized whole or not at all: a line holding a script no engine reads gets nothing rather
than half a romanization. The language is decided for the whole song, the lyrics' own language
first when their source gives it.

It needs a Myspoti with the `lyrics-romanize` hook, proposed upstream
([kota-zo/myspoti#154](https://github.com/kota-zo/myspoti/issues/154)).

## How it is built

- `src/domain`: the scripts of a line (code point ranges), the song's languages, the line cut into
  runs and put back together, within a time budget. Nothing in it knows Myspoti.
- `src/engines`: one romanizer per language, behind the `Romanizer` interface.
- `src/adapters/myspoti`: the `lyrics-romanize` hook.
- `tools/build.mjs`: esbuild bundles the extension, SWC lowers it to ES5 for Myspoti's sandbox
  (Rhino 1.8.1: no class, spread or for-of), and the package is zipped into `dist/`;
  `tools/rhino-compat.mjs` adapts what a dependency needs to load there.

## Development

```sh
npm ci
npm run check    # types, lint, unit tests, build into dist/
MYSPOTI_EXT=/path/to/myspoti-ext npm run rhino    # the built packages in Myspoti's own runner
```

`MYSPOTI_EXT` is the `myspoti-ext` launcher of a Myspoti build with the hook
(`base/extensions-cli/build/install/myspoti-ext/bin/myspoti-ext` after
`./gradlew :extensions-cli:installDist`).

## License

GPL-3.0-or-later (`LICENSE`). Bundled: [es-hangul](https://github.com/toss/es-hangul) (MIT), whose
notice is kept at the top of the built script.
