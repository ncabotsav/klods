import styles from "./Catalog.module.css";
import SetCover from "./SetCover";
import type { SearchEntry } from "@/lib/search";
import { dictFor, type Locale } from "@/i18n";
import { setPageHref } from "@/lib/site";

/** Carte d'un set dans une grille : couverture, nom, numéro, année, pièces et étapes. */
export default function SetCard({ locale, entry, headingLevel = 3, eager = false }: { locale: Locale; entry: SearchEntry; headingLevel?: 2 | 3; eager?: boolean }) {
  const fr = dictFor(locale);
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <li className={styles.card}>
      <SetCover locale={locale} number={entry.n} hasCover={entry.c} eager={eager} />
      <div className={styles.cardBody}>
        <H className={styles.cardTitle}>
          <a href={setPageHref(locale, entry.n)} className={styles.cardLink}>
            {entry.t}
          </a>
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

/**
 * Grille de cartes. `headingLevel` suit la page (2 sous le titre de la page, 3 sous une section) ;
 * les `eager` premières couvertures se chargent tout de suite (le haut de la page).
 */
export function SetGrid({ locale, entries, label, headingLevel = 3, eager = 0 }: { locale: Locale; entries: SearchEntry[]; label?: string; headingLevel?: 2 | 3; eager?: number }) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {entries.map((e, i) => (
        <SetCard key={e.n} locale={locale} entry={e} headingLevel={headingLevel} eager={i < eager} />
      ))}
    </ul>
  );
}
