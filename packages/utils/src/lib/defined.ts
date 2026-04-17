/**
 * Returns a partial object with `undefined` values stripped, intended for
 * spreading into object literals that must satisfy `exactOptionalPropertyTypes`.
 */
export function defined<T extends object>(obj: {[K in keyof T]?: T[K] | undefined}): Partial<T> {
  const out = {} as Record<PropertyKey, unknown>;
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<T>;
}
