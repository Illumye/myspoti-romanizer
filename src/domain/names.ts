/** The song a line is sung in, as its source names it. */
export interface SongTrack {
  readonly title: string;
  readonly artist: string;
}

// A shorter word is seldom a name, and too easily read into a line by chance.
const MIN_NAME = 3;

/**
 * The words of a song's title and artist in Latin letters, as written there: names its lines may
 * sing in another script (Kasane Teto sings 重音). Each once, its first spelling kept.
 */
export function namesOf(track: SongTrack): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const word of `${track.title} ${track.artist}`.split(/[^A-Za-zÀ-ɏ]+/)) {
    const lower = word.toLowerCase();
    if (word.length < MIN_NAME || seen.has(lower)) continue;
    seen.add(lower);
    names.push(word);
  }
  return names;
}
