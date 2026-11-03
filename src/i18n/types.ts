import type { fr } from "./fr.ts";

/** Langues du site. Le français est la référence ; l'anglais suit la même structure. */
export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Les textes de fr.ts sans leurs valeurs exactes : chaque langue doit avoir les mêmes clés, les mêmes fonctions. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { readonly [K in keyof T]: Widen<T[K]> }
        : T;

export type Dict = Widen<typeof fr>;
