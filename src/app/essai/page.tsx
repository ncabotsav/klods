import type { Metadata } from "next";
import { Suspense } from "react";
import Bench from "./Bench";
import { fr } from "@/i18n/fr";
import styles from "./Bench.module.css";

export const metadata: Metadata = { title: fr.bench.title, robots: { index: false, follow: false } };

/** Page de travail du moteur d'étapes : pas dans le menu, pas indexée. */
export default function BenchPage() {
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.intro}>
        <p className="eyebrow">{fr.bench.title}</p>
        <p className={styles.note}>{fr.bench.lead}</p>
      </div>
      <Suspense fallback={null}>
        <Bench />
      </Suspense>
    </div>
  );
}
