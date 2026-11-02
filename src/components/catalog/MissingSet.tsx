"use client";

import { useSyncExternalStore } from "react";
import styles from "@/components/ComingSoon.module.css";
import { officialManualUrl } from "@/lib/catalog";
import { fr } from "@/i18n/fr";

const noop = () => () => {};

/**
 * Sur la page 404 : si l'adresse est celle d'un set (« /set/1234-1/ ») qui n'est pas dans le catalogue,
 * on le dit et on renvoie vers sa notice officielle et vers LDraw.org pour contribuer un modèle.
 */
export default function MissingSet() {
  const path = useSyncExternalStore(noop, () => window.location.pathname, () => "");
  const number = /\/set\/([0-9][0-9a-z]*(?:-\d+)?)\/?/i.exec(decodeURIComponent(path))?.[1];
  if (!number) return null;
  return (
    <div className={styles.missing}>
      <p className="eyebrow">{fr.missingSet.eyebrow}</p>
      <h2 className={styles.missingTitle}>{fr.missingSet.title(number)}</h2>
      <p>{fr.missingSet.body}</p>
      <p className={styles.actions}>
        <a className="btn btn-primary" href={officialManualUrl(number)} target="_blank" rel="noopener">
          {fr.missingSet.official}
        </a>
        <a className="btn" href="https://library.ldraw.org/omr" target="_blank" rel="noopener">
          {fr.missingSet.contribute}
        </a>
      </p>
    </div>
  );
}
