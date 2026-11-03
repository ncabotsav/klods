import styles from "./Catalog.module.css";
import { asset } from "@/lib/site";
import { dictFor, type Locale } from "@/i18n";

/**
 * Couverture d'un set : l'image dessinée par `npm run data:covers`, ou à défaut une brique dessinée.
 * Décorative dans une carte (le nom du set est écrit à côté) : texte alternatif vide.
 */
export default function SetCover({ locale = "fr", number, hasCover, large = false, eager = false }: { locale?: Locale; number: string; hasCover: boolean; large?: boolean; eager?: boolean }) {
  const fr = dictFor(locale);
  return (
    <div className={`${styles.cover} ${large ? styles.coverLarge : ""}`}>
      {hasCover ? (
        // eslint-disable-next-line @next/next/no-img-element -- site statique, pas d'optimisation d'images
        <img src={asset(`/data/covers/${number}.webp`)} alt="" width={640} height={480} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} decoding="async" />
      ) : (
        <svg viewBox="0 0 120 90" className={styles.brick} role="img" aria-label={fr.set.noCover}>
          <path d="M20 40 L60 22 L100 40 L100 62 L60 80 L20 62 Z" fill="var(--card)" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M20 40 L60 58 L100 40 M60 58 L60 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <ellipse cx="46" cy="36" rx="7" ry="3.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <ellipse cx="74" cy="36" rx="7" ry="3.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      )}
    </div>
  );
}
