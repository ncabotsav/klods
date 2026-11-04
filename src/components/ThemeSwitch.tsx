"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import styles from "./SiteChrome.module.css";
import { useT } from "@/i18n/LocaleProvider";
import { THEMES, onThemeChange, readTheme, saveTheme, type ThemeChoice } from "@/lib/theme";

/** Icônes dessinées au trait : soleil (clair), lune (sombre), disque à moitié plein (automatique). */
function Icon({ theme }: { theme: ThemeChoice }) {
  if (theme === "light")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
      </svg>
    );
  if (theme === "dark")
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16Z" className={styles.themeFill} />
    </svg>
  );
}

/**
 * Choix du thème dans l'en-tête : un bouton (icône du thème actuel) qui ouvre trois choix,
 * Automatique, Clair, Sombre. Échap ou un clic ailleurs referme ; le focus revient au bouton.
 */
export default function ThemeSwitch() {
  const t = useT();
  const theme = useSyncExternalStore(onThemeChange, readTheme, () => "auto" as ThemeChoice);
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const name = (c: ThemeChoice) => t.theme[c];

  useEffect(() => {
    if (!open) return;
    box.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={styles.themeBox} ref={box}>
      <button
        ref={button}
        type="button"
        className={styles.themeButton}
        aria-expanded={open}
        aria-controls={id}
        aria-label={t.theme.button(name(theme))}
        title={t.theme.button(name(theme))}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon theme={theme} />
      </button>
      {open && (
        <div id={id} role="group" aria-label={t.theme.label} className={styles.themePanel}>
          {THEMES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === theme}
              className={styles.themeOption}
              onClick={() => {
                saveTheme(c);
                setOpen(false);
                button.current?.focus();
              }}
            >
              <Icon theme={c} />
              {name(c)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
