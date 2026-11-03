/** The code point at [index] of [text], a surrogate pair read as one. */
export function codePointAt(text: string, index: number): number {
  return text.codePointAt(index) ?? 0;
}

/** How many UTF-16 units code point [cp] takes. */
export function unitsOf(cp: number): number {
  return cp > 0xffff ? 2 : 1;
}

/** Whether [cp] is a combining mark: it belongs to the letter before it (a stress mark, a dakuten). */
export function isCombining(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe20 && cp <= 0xfe2f)
  );
}
