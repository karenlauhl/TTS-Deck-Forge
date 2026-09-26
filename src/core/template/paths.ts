/** Read a dot-path like `colors.black.text` from a nested object. */
export function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Immutable set of a dot-path; creates intermediate objects. */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const base = (obj && typeof obj === 'object' ? obj : {}) as Record<string, unknown>;
  return {
    ...base,
    [head]: rest.length === 0 ? value : setPath(base[head], rest.join('.'), value),
  } as T;
}
