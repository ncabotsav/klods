import type { Metadata } from "next";
import { localeHref, type Locale } from "@/i18n";

/**
 * Pages de texte et leur adresse dans chaque langue (les autres pages ont la même adresse, préfixée
 * par /en en anglais).
 */
export const TEXT_PAGES = {
  about: { fr: "/a-propos/", en: "/about/" },
  privacy: { fr: "/confidentialite/", en: "/privacy/" },
  terms: { fr: "/conditions/", en: "/terms/" },
  legal: { fr: "/mentions-legales/", en: "/legal/" },
  credits: { fr: "/credits/", en: "/credits/" },
} as const;
export type TextPageKey = keyof typeof TEXT_PAGES;

/** Adresse d'une page de texte dans une langue. */
export const textPageHref = (key: TextPageKey, locale: Locale) => localeHref(locale, TEXT_PAGES[key][locale]);

/**
 * Adresse canonique et versions dans chaque langue (hreflang) d'une page qui existe en français et en
 * anglais. `paths` : son chemin dans chaque langue, sans le préfixe /en.
 */
export function bilingual(locale: Locale, paths: { fr: string; en: string }): Metadata["alternates"] {
  return {
    canonical: localeHref(locale, paths[locale]),
    languages: { fr: paths.fr, en: localeHref("en", paths.en), "x-default": paths.fr },
  };
}
