import Link from "next/link";
import styles from "./Catalog.module.css";
import SetCover from "./SetCover";
import type { SearchEntry } from "@/lib/search";
import { fr } from "@/i18n/fr";

/** Carte d'un set dans une grille : couverture, nom, numéro, année, pièces et étapes. */
export default function SetCard({ entry, headingLevel = 3 }: { entry: SearchEntry; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <li className={styles.card}>
      <SetCover number={entry.n} hasCover={entry.c} />
      <div className={styles.cardBody}>
        <H className={styles.cardTitle}>
          <Link href={`/set/${entry.n}/`} className={styles.cardLink}>
            {entry.t}
          </Link>
        </H>
        <p className={styles.cardMeta}>{[entry.n, entry.y].filter(Boolean).join(" · ")}</p>
        <p className={styles.cardStats}>
          {fr.set.pieces(entry.p)}
          {entry.e ? <> · {fr.set.steps(entry.s)}</> : <span className={styles.badge}>{fr.set.noSteps}</span>}
        </p>
      </div>
    </li>
  );
}

/** Grille de cartes. */
export function SetGrid({ entries, label }: { entries: SearchEntry[]; label?: string }) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {entries.map((e) => (
        <SetCard key={e.n} entry={e} />
      ))}
    </ul>
  );
}
