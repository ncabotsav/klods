/**
 * Thème choisi : clair, sombre, ou automatique (celui du système, par défaut). Gardé dans le
 * navigateur ; posé sur <html data-theme="…"> que les jetons de globals.css lisent. Le script
 * THEME_SCRIPT le pose avant le premier affichage, pour éviter un éclair de l'autre thème.
 */
export type ThemeChoice = "auto" | "light" | "dark";
export const THEMES: ThemeChoice[] = ["auto", "light", "dark"];
const KEY = "klods:theme";
const listeners = new Set<() => void>();

/** Script en ligne du <head> (sa CSP est posée par scripts/site/finalize.ts, par empreinte). */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function readTheme(): ThemeChoice {
  try {
    const t = window.localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

export function saveTheme(theme: ThemeChoice) {
  try {
    if (theme === "auto") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, theme);
  } catch {
    /* pas de stockage : le choix vaut pour cette page */
  }
  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  for (const l of listeners) l();
}

export function onThemeChange(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    const t = readTheme();
    if (t === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
