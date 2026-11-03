import type { Locale } from "@/i18n/types";
import { BASE_PATH } from "@/lib/site";

/**
 * Langue choisie, gardée dans le navigateur. Une page d'une langue précise l'enregistre à chaque visite
 * (la dernière langue lue) ; les pages communes (montage, atelier…) la lisent. À défaut : la langue du
 * navigateur, français s'il le parle, sinon anglais.
 */
const KEY = "klods:langue";
const listeners = new Set<() => void>();

export function readLocale(): Locale {
  // une adresse anglaise inconnue tombe sur la page 404 commune : elle parle anglais
  if (window.location.pathname.startsWith(`${BASE_PATH}/en/`)) return "en";
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "fr" || stored === "en") return stored;
  } catch {
    /* stockage bloqué : langue du navigateur */
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => /^fr\b/i.test(l)) ? "fr" : "en";
}

export function saveLocale(locale: Locale) {
  try {
    if (window.localStorage.getItem(KEY) === locale) return;
    window.localStorage.setItem(KEY, locale);
  } catch {
    /* pas de stockage : le choix vaut pour cette page */
  }
  for (const l of listeners) l();
}

export function onLocaleChange(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
