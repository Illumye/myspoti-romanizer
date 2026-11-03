# Lyrics Romanizer for Myspoti

A [Myspoti](https://github.com/kota-zo/myspoti) extension that writes lyrics in Japanese, Korean and
Cyrillic scripts in Latin letters, offline, under each line of the songs whose lyrics come without a
romanization. A romanization the lyrics' source gives (Apple Music, NetEase) always comes first.

## What it romanizes

| Language   | System                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| Japanese   | Revised Hepburn: wa, e, o for the particles, macrons (Tōkyō), sensei, oishii |
| Korean     | Revised Romanization (2000), after the standard pronunciation rules          |
| Russian    | BGN/PCGN, without diacritics                                                 |
| Ukrainian  | National system (2010)                                                       |
| Belarusian | BGN/PCGN, without diacritics                                                 |
| Bulgarian  | Streamlined System (2009)                                                    |
| Serbian    | Serbian Latin alphabet                                                       |
| Macedonian | Official system (2008)                                                       |

A line is romanized whole or not at all: a line holding a script no engine reads, or a kanji the
Japanese lexicon has no reading for, gets nothing rather than half a romanization. The language is
decided for the whole song (a line of kanji alone is Japanese in a song with kana elsewhere), the
lyrics' own language first when their source gives it.

It needs a Myspoti with the `lyrics-romanize` hook, proposed upstream
([kota-zo/myspoti#154](https://github.com/kota-zo/myspoti/issues/154)).

## Japanese

The engine reads a line as MeCab reads it with UniDic, from a model distilled offline into the
script: about 52,500 words with their readings and costs, and the costs of word classes following
one another. It cuts each run into its cheapest sequence of words (Viterbi), spaces them as
[cutlet](https://github.com/polm/cutlet) does, then writes them in revised Hepburn.

The words and the costs come from subtitles (3.2 million lines) and, weighted a hundredfold, from
the lyrics of 230 songs, for the words songs use and subtitles do not. On the lyrics of 66 other
songs, by other artists, it reads 98.5 % of the runs, 93.8 % exactly as MeCab does; most of the
others are the readings it corrects on purpose for songs (`tools/japanese/corrections.tsv`: 私
watashi, 明日 ashita, お母さん okāsan, 二つ futatsu, 何 nani or nan by what follows).

The model is rebuilt with Python, in `tools/japanese`. The corpus and the lyrics stay in
`tools/japanese/data`, out of the repository: only word counts reach the model.

```sh
uv venv tools/japanese/.venv --python 3.12
uv pip install --python tools/japanese/.venv/bin/python fugashi==1.5.2 unidic-lite==1.0.8 cutlet==0.5.2
curl -L -o tools/japanese/data/opensubtitles-ja.txt.gz https://object.pouta.csc.fi/OPUS-OpenSubtitles/v2018/mono/ja.txt.gz
cd tools/japanese
.venv/bin/python fetch_lyrics.py data/lyrics-eval.txt --set evaluation
.venv/bin/python fetch_lyrics.py data/lyrics-train.txt --set training --per-artist 10 --exclude data/lyrics-eval.txt
.venv/bin/python stats.py data/opensubtitles-ja.txt.gz data/stats.json.gz
.venv/bin/python stats.py data/lyrics-train.txt data/stats-lyrics.json.gz
.venv/bin/python build.py data/stats.json.gz ../../src/engines/japanese/data/model.generated.ts --lyrics data/stats-lyrics.json.gz --lyrics-weight 100
# measured on the evaluation lyrics only, which the model never learned from
.venv/bin/python reference.py data/lyrics-eval.txt data/reference.json
node evaluate.mjs data/reference.json data/mismatches.txt
```

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
notice is kept at the top of the built script. The Japanese model is derived from
[UniDic](https://clrd.ninjal.ac.jp/unidic/) 2.1.2 (© UniDic Consortium, BSD, GPL or LGPL) and from
word statistics of the OpenSubtitles corpus ([OPUS](https://opus.nlpl.eu/), Lison and Tiedemann,
2016); it holds no text of either.
