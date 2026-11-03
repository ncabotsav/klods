"use client";

import { useSyncExternalStore } from "react";
import styles from "./SiteChrome.module.css";
import { fr } from "@/i18n/fr";
import { GITHUB_URL } from "@/lib/site";

/** Bandeau fermé : retenu dans ce navigateur seulement. */
const KEY = "klods:bandeau-preversion-ferme";
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const isClosed = () => {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** Bandeau de la préversion, sous l'en-tête : le site est en test, les retours passent par GitHub. On peut le fermer. */
export default function PreviewBanner() {
  const closed = useSyncExternalStore(subscribe, isClosed, () => false);
  if (closed) return null;

  const close = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // stockage bloqué : le bandeau revient à la prochaine visite
    }
    listeners.forEach((fn) => fn());
  };

  return (
    <aside className={styles.preview} aria-label={fr.preview.label}>
      <div className={`wrap ${styles.previewInner}`}>
        <p className={styles.previewText}>
          <span className={styles.previewLabel}>{fr.preview.label}</span>
          <span>{fr.preview.body}</span>
          <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noopener">
            {fr.preview.link}
          </a>
        </p>
        <button type="button" className={styles.previewClose} onClick={close} aria-label={fr.preview.close} title={fr.preview.close}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
