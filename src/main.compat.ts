import { registerLyricsHook } from './adapters/myspoti/compat';
import { cyrillic } from './engines/cyrillic';
import { japanese } from './engines/japanese';
import { korean } from './engines/korean';

// The variant for a Myspoti without the lyrics-romanize hook: it gives the song's lyrics back with
// their romanizations, which Myspoti keeps on the lyrics it shows.
registerLyricsHook(myspoti, { ja: japanese, ko: korean, ...cyrillic });
