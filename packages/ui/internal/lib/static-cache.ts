/** Memoizes `fn` by key. */
export function staticCache<K, T>(fn: (key: K) => T): (key: K) => T {
  const cache = new Map<K, T>();
  return (key: K) => {
    if (!cache.has(key)) {
      cache.set(key, fn(key));
    }
    return cache.get(key) as T;
  };
}
