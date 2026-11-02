"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import styles from "./ResumeBuilds.module.css";
import { getServerSnapshot, getSnapshot, inProgress, subscribe } from "@/lib/progress";
import { fr } from "@/i18n/fr";

/** Encart « Reprendre » de l'accueil : les montages commencés dans ce navigateur. */
export default function ResumeBuilds() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const builds = inProgress(store).slice(0, 3);
  if (!builds.length) return null;
  return (
    <section className={styles.resume} aria-labelledby="resume-title">
      <h2 id="resume-title" className={styles.title}>
        {fr.resume.title}
      </h2>
      <ul className={styles.list}>
        {builds.map((b) => {
          const q = new URLSearchParams({ modele: b.model, etape: String(b.step + 1) });
          return (
            <li key={`${b.number}/${b.model}`}>
              <Link href={`/set/${b.number}/monter/?${q}`} className={styles.item}>
                <span className={styles.name}>{b.name}</span>
                <span className={styles.meta}>
                  {b.number} · {fr.resume.step(b.step + 1, b.steps)}
                </span>
                <span className={styles.bar} aria-hidden="true">
                  <span style={{ width: `${Math.round(((b.step + 1) / Math.max(1, b.steps)) * 100)}%` }} />
                </span>
                <span className={styles.open}>{fr.resume.open} →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
