"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./ResumeBuilds.module.css";
import { getServerSnapshot, getSnapshot, inProgress, removeProgress, restoreProgress, subscribe, type Progress } from "@/lib/progress";
import { useT } from "@/i18n/LocaleProvider";
import { buildPageHref } from "@/lib/site";

/** Le bandeau « Annuler » reste ce temps-là, et tant que le focus est dessus. */
const UNDO_MS = 8000;

/**
 * Encart « Reprendre » de l'accueil : les montages commencés dans ce navigateur.
 * Une croix retire un montage (et sa progression) ; un bandeau permet d'annuler pendant quelques secondes.
 */
export default function ResumeBuilds({ limit = 3, title }: { limit?: number; title?: string }) {
  const fr = useT();
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const builds = inProgress(store).slice(0, limit);
  const [undo, setUndo] = useState<Progress | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const focusInside = useRef(false);

  // le bandeau disparaît seul, sauf si on est dessus au clavier
  useEffect(() => {
    if (!undo) return;
    undoRef.current?.focus();
    const timer = window.setInterval(() => {
      if (!focusInside.current) setUndo(null);
    }, UNDO_MS);
    return () => window.clearInterval(timer);
  }, [undo]);

  if (!builds.length && !undo) return null;

  const remove = (b: Progress) => {
    const removed = removeProgress(b.number, b.model);
    if (removed) setUndo(removed);
  };

  const cancel = () => {
    if (!undo) return;
    restoreProgress(undo);
    const key = `${undo.number}/${undo.model}`;
    setUndo(null);
    focusInside.current = false;
    // le focus revient sur la carte remise en place
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLAnchorElement>(`a[data-key="${CSS.escape(key)}"]`)?.focus());
  };

  return (
    <section className={styles.resume} aria-labelledby="resume-title">
      <h2 id="resume-title" className={styles.title}>
        {title ?? fr.resume.title}
      </h2>
      {builds.length > 0 && (
        <ul className={styles.list} ref={listRef}>
          {builds.map((b) => {
            const key = `${b.number}/${b.model}`;
            const q = new URLSearchParams({ modele: b.model, etape: String(b.step + 1) });
            return (
              <li key={key} className={styles.card}>
                <a href={buildPageHref(`/set/${b.number}/monter/?${q}`)} className={styles.item} data-key={key}>
                  <span className={styles.name}>{b.name}</span>
                  <span className={styles.meta}>
                    {b.number} · {fr.resume.step(b.step + 1, b.steps)}
                  </span>
                  <span className={styles.bar} aria-hidden="true">
                    <span style={{ width: `${Math.round(((b.step + 1) / Math.max(1, b.steps)) * 100)}%` }} />
                  </span>
                  <span className={styles.open}>{fr.resume.open} →</span>
                </a>
                <button type="button" className={styles.remove} onClick={() => remove(b)} aria-label={fr.resume.remove(b.name)} title={fr.resume.removeTitle}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div
        className={styles.undo}
        role="status"
        aria-live="polite"
        hidden={!undo}
        onFocus={() => (focusInside.current = true)}
        onBlur={() => (focusInside.current = false)}
      >
        {undo && (
          <>
            <span id="resume-undo-text">{fr.resume.removed(undo.name)}</span>
            {/* le focus arrive ici après le retrait : le bouton lit aussi le message */}
            <button type="button" ref={undoRef} className="btn" onClick={cancel} aria-describedby="resume-undo-text">
              {fr.resume.undo}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
