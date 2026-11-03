/** Tire `count` éléments au hasard (Fisher-Yates partiel), sans modifier la liste. */
export function pickRandom<T>(list: readonly T[], count: number, random = Math.random): T[] {
  const a = [...list];
  const n = Math.min(count, a.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
