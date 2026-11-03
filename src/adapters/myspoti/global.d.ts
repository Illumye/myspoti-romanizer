import type { MyspotiApi } from './api';

declare global {
  /** Myspoti's API: with the standard objects and `console`, all an extension's script sees. */
  const myspoti: MyspotiApi;
}

export {};
