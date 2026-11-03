"use client";

import { useEffect } from "react";
import styles from "@/components/ComingSoon.module.css";
import { useT } from "@/i18n/LocaleProvider";
import { asset } from "@/lib/site";

/** Page d'erreur de l'application, en français (sans réseau, ou une page qui ne se charge pas). */
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const fr = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className={`wrap ${styles.box}`}>
      <h1 className={styles.title}>{fr.error.title}</h1>
      <p className={styles.body}>{fr.error.body}</p>
      <p className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={() => retry()}>
          {fr.error.retry}
        </button>
        <a className="btn" href={asset("/hors-connexion/")}>
          {fr.error.offline}
        </a>
      </p>
    </div>
  );
}
