import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Myspoti's sandbox runs Rhino 1.8.1, and the build lowers syntax to ES5 but never regular
// expressions: a pattern Rhino cannot compile would only fail on the phone.
const RHINO_REGEX = [
  {
    selector: 'Literal[regex.flags=/[uvsd]/]',
    message: 'Rhino has no u, v, s or d flag: compare code points instead.',
  },
  {
    selector: 'Literal[regex.pattern=/\\(\\?</]',
    message: 'Rhino has no lookbehind and no named group.',
  },
  {
    selector: "NewExpression[callee.name='RegExp'], CallExpression[callee.name='RegExp']",
    message: 'Write patterns as literals, so the rules above can check them.',
  },
];

export default defineConfig(
  globalIgnores(['dist/', 'coverage/', 'tools/japanese/.venv/', 'src/engines/japanese/data/']),
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', ...RHINO_REGEX] },
  },
);
