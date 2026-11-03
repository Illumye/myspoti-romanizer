// What the dependencies need to load in Myspoti's sandbox (Rhino 1.8.1), done while bundling.
import { readFile } from 'node:fs/promises';

const EXPECTED_UNICODE_FLAGS = 4;

/**
 * es-hangul 2.4.0 builds four regular expressions with the u flag as it loads, for getChoseong,
 * getJungseong and getJongseong, which this extension never calls. Rhino refuses that flag, and
 * these patterns, classes of Basic Multilingual Plane ranges, match the same without it. The count
 * is checked so that another version of es-hangul is looked at again before it ships.
 */
export const esHangulWithoutUnicodeFlag = {
  name: 'es-hangul-without-unicode-flag',
  setup(build) {
    build.onLoad({ filter: /[\\/]es-hangul[\\/]dist[\\/]index\.mjs$/ }, async (args) => {
      const source = await readFile(args.path, 'utf8');
      const found = source.split('"ug"').length - 1;
      if (found !== EXPECTED_UNICODE_FLAGS) {
        throw new Error(
          `es-hangul: ${found} u-flag patterns, ${EXPECTED_UNICODE_FLAGS} expected: check them for Rhino again`,
        );
      }
      return { contents: source.split('"ug"').join('"g"'), loader: 'js' };
    });
  },
};
