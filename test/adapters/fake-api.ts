import type { MyspotiApi } from '../../src/adapters/myspoti/api';

type Sources = Partial<Pick<MyspotiApi, 'http' | 'spotify'>>;

/** A Myspoti API that keeps what the extension provides, with the lyrics sources a test gives it. */
export function fakeApi(sources: Sources = {}) {
  const provided = new Map<string, (input: never) => unknown>();
  const logs: string[] = [];
  const api = {
    provide: (hook: string, answer: (input: never) => unknown) => provided.set(hook, answer),
    log: (...values: unknown[]) => logs.push(values.map(String).join(' ')),
    query: (params: Readonly<Record<string, string | number | undefined>>) =>
      Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&'),
    ...sources,
  } as unknown as MyspotiApi;
  return { api, provided, logs };
}
