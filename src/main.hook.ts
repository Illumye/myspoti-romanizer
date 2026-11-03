import { registerRomanizeHook } from './adapters/myspoti/hook';
import { cyrillic } from './engines/cyrillic';
import { korean } from './engines/korean';

// The variant for a Myspoti with the lyrics-romanize hook: it asks for the lines its lyrics left
// without a romanization, whatever their source.
registerRomanizeHook(myspoti, { ko: korean, ...cyrillic });
