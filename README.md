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

## Two variants, one extension

Both carry the same id, so going from one to the other is an update.

- **For a Myspoti with the `lyrics-romanize` hook** (`extension-hook.zip`), proposed upstream
  ([kota-zo/myspoti#154](https://github.com/kota-zo/myspoti/issues/154)): Myspoti asks for the lines
  any source left without a romanization, whatever that source, and nothing else is needed. This is
  the one to use when your Myspoti has the hook.
- **For Myspoti as it is** (`extension.zip`, the store's): Myspoti has no way yet to ask an
  extension for romanizations alone, so this one answers the `lyrics` hook with the song's lyrics,
  Spotify's own or LRCLIB's, each line also in Latin letters, and Myspoti keeps the romanizations
  when it matches these lines to the lyrics it shows.

Install: from Myspoti's store, or **Install from an address** with
`https://github.com/Illumye/myspoti-romanizer` (the newest release's `extension.zip`); the hook
variant with the address of the release's `extension-hook.zip`, or **Install from a file**.

### What the variant for Myspoti as it is cannot do

It goes through a hook made to give lyrics, not to romanize the ones shown, so some songs keep their
lines without a romanization where the hook variant gives one:

- **Spotify's word-by-word lyrics.** When Myspoti finds them complete, it does not wait for the
  extensions at all.
- **Lyrics with extras of their own.** When the lyrics shown already carry a translation or a
  romanization from their source (NetEase often gives a translation), Myspoti keeps those and takes
  nothing from an extension.
- **Lyrics worded otherwise.** Myspoti keeps the romanizations only when at least a third of the
  lines match its own word for word; lyrics from a source that writes them differently get none.

It also reads each song's lyrics itself, one more request per song, which is why it asks to read
Spotify's lyrics and lrclib.net. It shows among the lyrics sources ("Try another source"), and with
lyrics as good as Myspoti's own it may be the one shown, with the same text.

## Japanese

The engine reads a line as MeCab reads it with UniDic, from a model distilled offline into the
script: about 47,400 words with their readings and costs, 4,300 verbs and adjectives kept once each
as a stem it conjugates (罵 and the endings of its kind: 罵れば, nonoshireba, a form no subtitle
showed), and the costs of word classes following one another. It cuts each run into its cheapest
sequence of words (Viterbi), spaces them as [cutlet](https://github.com/polm/cutlet) does, then
writes them in revised Hepburn. A number in digits stays in digits, read with its counter (17歳,
17 sai), or as the word it makes (2人, futari; 20歳, hatachi).

The words and the costs come from subtitles (3.2 million lines) and, weighted a hundredfold, from
the lyrics of 230 songs, for the words songs use and subtitles do not. On the lyrics of 66 other
songs, by other artists, it reads 99.1 % of the runs, 94.5 % exactly as MeCab does; most of the
others are the readings it corrects on purpose for songs (`tools/japanese/corrections.tsv`: 私
watashi, 明日 ashita, お母さん okāsan, 二つ futatsu, 三十路 misoji, 何 nani or nan by what follows).

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
- `src/adapters/myspoti`: the `lyrics-romanize` hook (`hook.ts`) and the `lyrics` one (`compat.ts`,
  with the lyrics of Spotify and LRCLIB in `sources.ts`).
- `tools/build.mjs`: esbuild bundles each variant, SWC lowers it to ES5 for Myspoti's sandbox
  (Rhino 1.8.1: no class, spread or for-of), each package is zipped into `dist/`, and the store
  variant's manifest written at the root, where Myspoti's store reads it; `tools/rhino-compat.mjs`
  adapts what a dependency needs to load there.

## Development

```sh
npm ci
npm run check    # types, lint, unit tests, build into dist/
MYSPOTI_EXT=/path/to/myspoti-ext npm run rhino    # the built packages in Myspoti's own runner
```

`MYSPOTI_EXT` is the `myspoti-ext` launcher of a Myspoti build with the hook
(`base/extensions-cli/build/install/myspoti-ext/bin/myspoti-ext` after
`./gradlew :extensions-cli:installDist`).

A release is a tag `vX.Y.Z` matching `package.json`'s version: the Release workflow checks it,
builds, and attaches `extension.zip` and `extension-hook.zip`. The repository's topic
`myspoti-extension` lists it in Myspoti's store.

## License

GPL-3.0-or-later (`LICENSE`). Bundled: [es-hangul](https://github.com/toss/es-hangul) (MIT), whose
notice is kept at the top of the built script. The Japanese model is derived from
[UniDic](https://clrd.ninjal.ac.jp/unidic/) 2.1.2 (© UniDic Consortium, BSD, GPL or LGPL) and from
word statistics of the OpenSubtitles corpus ([OPUS](https://opus.nlpl.eu/), Lison and Tiedemann,
2016); it holds no text of either.
