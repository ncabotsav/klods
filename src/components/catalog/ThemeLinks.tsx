import Link from "next/link";
import styles from "@/views/Catalogue.module.css";
import { allThemes } from "@/lib/catalog-server";
import { dictFor, localeHref, type Locale } from "@/i18n";

/** Liens vers les pages de thème (indexables), sous le catalogue. */
export default function ThemeLinks({ locale }: { locale: Locale }) {
  const fr = dictFor(locale);
  const themes = allThemes(locale);
  if (!themes.length) return null;
  return (
    <nav className={styles.themes} aria-labelledby="themes-title">
      <h2 id="themes-title" className={styles.themesTitle}>
        {fr.catalogue.themes}
      </h2>
      <ul className={styles.themeList}>
        {themes.map((th) => (
          <li key={th.slug}>
            <Link href={localeHref(locale, `/catalogue/${th.slug}/`)}>
              {th.name} <span className={styles.count}>{th.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
