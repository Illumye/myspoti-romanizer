// Katakana in revised Hepburn. Hiragana is read through its katakana twin.

/** One kana alone. */
// prettier-ignore
export const SINGLE: Readonly<Record<string, string>> = {
  ァ: 'a', ア: 'a', ィ: 'i', イ: 'i', ゥ: 'u', ウ: 'u', ェ: 'e', エ: 'e', ォ: 'o', オ: 'o',
  カ: 'ka', ガ: 'ga', キ: 'ki', ギ: 'gi', ク: 'ku', グ: 'gu', ケ: 'ke', ゲ: 'ge', コ: 'ko', ゴ: 'go',
  サ: 'sa', ザ: 'za', シ: 'shi', ジ: 'ji', ス: 'su', ズ: 'zu', セ: 'se', ゼ: 'ze', ソ: 'so', ゾ: 'zo',
  タ: 'ta', ダ: 'da', チ: 'chi', ヂ: 'ji', ツ: 'tsu', ヅ: 'zu', テ: 'te', デ: 'de', ト: 'to', ド: 'do',
  ナ: 'na', ニ: 'ni', ヌ: 'nu', ネ: 'ne', ノ: 'no',
  ハ: 'ha', バ: 'ba', パ: 'pa', ヒ: 'hi', ビ: 'bi', ピ: 'pi', フ: 'fu', ブ: 'bu', プ: 'pu',
  ヘ: 'he', ベ: 'be', ペ: 'pe', ホ: 'ho', ボ: 'bo', ポ: 'po',
  マ: 'ma', ミ: 'mi', ム: 'mu', メ: 'me', モ: 'mo',
  ャ: 'ya', ヤ: 'ya', ュ: 'yu', ユ: 'yu', ョ: 'yo', ヨ: 'yo',
  ラ: 'ra', リ: 'ri', ル: 'ru', レ: 're', ロ: 'ro',
  ヮ: 'wa', ワ: 'wa', ヰ: 'i', ヱ: 'e', ヲ: 'o', ン: 'n', ヴ: 'vu', ヵ: 'ka', ヶ: 'ke',
  ヷ: 'va', ヸ: 'vi', ヹ: 've', ヺ: 'vo',
};

/** A kana and the small one after it, read as one syllable: the yōon and the sounds of loanwords. */
// prettier-ignore
export const DOUBLE: Readonly<Record<string, string>> = {
  キャ: 'kya', キュ: 'kyu', キョ: 'kyo', ギャ: 'gya', ギュ: 'gyu', ギョ: 'gyo',
  シャ: 'sha', シュ: 'shu', ショ: 'sho', ジャ: 'ja', ジュ: 'ju', ジョ: 'jo',
  チャ: 'cha', チュ: 'chu', チョ: 'cho', ヂャ: 'ja', ヂュ: 'ju', ヂョ: 'jo',
  ニャ: 'nya', ニュ: 'nyu', ニョ: 'nyo', ヒャ: 'hya', ヒュ: 'hyu', ヒョ: 'hyo',
  ビャ: 'bya', ビュ: 'byu', ビョ: 'byo', ピャ: 'pya', ピュ: 'pyu', ピョ: 'pyo',
  ミャ: 'mya', ミュ: 'myu', ミョ: 'myo', リャ: 'rya', リュ: 'ryu', リョ: 'ryo',
  イェ: 'ye', ウィ: 'wi', ウェ: 'we', ウォ: 'wo',
  ヴァ: 'va', ヴィ: 'vi', ヴェ: 've', ヴォ: 'vo', ヴュ: 'vyu',
  シェ: 'she', ジェ: 'je', チェ: 'che', スィ: 'si', ズィ: 'zi',
  ツァ: 'tsa', ツィ: 'tsi', ツェ: 'tse', ツォ: 'tso',
  ティ: 'ti', ディ: 'di', テュ: 'tyu', デュ: 'dyu', トゥ: 'tu', ドゥ: 'du',
  ファ: 'fa', フィ: 'fi', フェ: 'fe', フォ: 'fo', フュ: 'fyu',
  キェ: 'kye', ギェ: 'gye', クァ: 'kwa', クィ: 'kwi', クェ: 'kwe', クォ: 'kwo', グァ: 'gwa',
  ニェ: 'nye', ヒェ: 'hye', ミェ: 'mye', リェ: 'rye', ビェ: 'bye', ピェ: 'pye',
};

/** A vowel and the same vowel held long, as the chōon mark ー writes it. */
export const MACRON: Readonly<Record<string, string>> = { a: 'ā', i: 'ī', u: 'ū', e: 'ē', o: 'ō' };
