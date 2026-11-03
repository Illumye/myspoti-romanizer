import { describe, expect, it } from 'vitest';
import { parseLrc, parsePlain } from '../../src/adapters/myspoti/lrc';

describe('parseLrc', () => {
  it('reads each line at its time, in milliseconds', () => {
    expect(parseLrc('[00:12.34] 君を愛してる\n[01:02:50]사랑해')).toEqual([
      { time: 12340, text: '君を愛してる' },
      { time: 62500, text: '사랑해' },
    ]);
  });

  it('gives a line sung several times once per time, all in time order', () => {
    expect(parseLrc('[00:05.00]B\n[00:01.00][00:09.00]A')).toEqual([
      { time: 1000, text: 'A' },
      { time: 5000, text: 'B' },
      { time: 9000, text: 'A' },
    ]);
  });

  it('leaves out the tags and the lines without a time', () => {
    expect(parseLrc('[ar:Artist]\n[ti:Title]\nno time\n[00:01.5]x')).toEqual([{ time: 1500, text: 'x' }]);
  });
});

describe('parsePlain', () => {
  it('reads one line per row, untimed', () => {
    expect(parsePlain('君を\n 愛してる ')).toEqual([
      { time: 0, text: '君を' },
      { time: 0, text: '愛してる' },
    ]);
  });
});
