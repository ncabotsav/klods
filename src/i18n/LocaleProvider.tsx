"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { DICTS, type Dict, type Locale } from "@/i18n";
import { onLocaleChange, readLocale, saveLocale } from "@/lib/locale-pref";

type LocaleState = { locale: Locale; t: Dict; fixed: boolean; setLocale: (l: Locale) => void };

const Ctx = createContext<LocaleState>({ locale: "fr", t: DICTS.fr, fixed: true, setLocale: () => {} });

/**
 * Langue des composants clients d'une page.
 * - `locale` donné : page d'une langue (accueil, fiche…), la langue est fixe et devient le choix gardé.
 * - sans `locale` : page commune (montage, atelier…), la langue est celle gardée dans le navigateur ;
 *   la page construite est en français, puis passe à la langue choisie dès son chargement.
 */
export function LocaleProvider({ locale: fixed, children }: { locale?: Locale; children: ReactNode }) {
  const chosen = useSyncExternalStore(onLocaleChange, readLocale, () => "fr" as Locale);
  const locale = fixed ?? chosen;

  useEffect(() => {
    if (fixed) saveLocale(fixed);
  }, [fixed]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <Ctx.Provider value={{ locale, t: DICTS[locale], fixed: !!fixed, setLocale: saveLocale }}>{children}</Ctx.Provider>;
}

/** Textes de la langue de la page. */
export const useT = () => useContext(Ctx).t;
export const useLocale = () => useContext(Ctx);
