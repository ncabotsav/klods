import { en } from "./en.ts";
import { fr } from "./fr.ts";
import type { Dict, Locale } from "./types.ts";

export { LOCALES, type Dict, type Locale } from "./types.ts";

export const DICTS: Record<Locale, Dict> = { fr, en };

/** Textes d'une langue. */
export const dictFor = (locale: Locale): Dict => DICTS[locale];

/**
 * Préfixe des pages d'une langue : le français est à la racine, l'anglais sous /en.
 * Seules les pages qu'on trouve par un moteur de recherche existent dans les deux langues (accueil,
 * catalogue, thèmes, fiches, pages de texte) ; les outils (montage, impression, atelier, retours…) sont
 * communs et prennent la langue choisie dans le navigateur.
 */
export const localePrefix = (locale: Locale) => (locale === "fr" ? "" : "/en");
export const localeHref = (locale: Locale, path: string) => `${localePrefix(locale)}${path}`;

/** Langue « BCP 47 » complète, pour les dates, les nombres et Open Graph. */
export const LOCALE_TAGS: Record<Locale, string> = { fr: "fr-FR", en: "en-GB" };
