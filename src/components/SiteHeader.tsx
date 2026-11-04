"use client";

import Link from "next/link";
import Logo from "./Logo";
import LanguageSwitch from "./LanguageSwitch";
import ThemeSwitch from "./ThemeSwitch";
import styles from "./SiteChrome.module.css";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeHref } from "@/i18n";
import { GITHUB_URL } from "@/lib/site";
import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, inProgress, subscribe } from "@/lib/progress";

/** En-tête de toutes les pages, dans la langue de la page. `stars` : étoiles du dépôt, lues au build. */
export default function SiteHeader({ stars }: { stars: number | null }) {
  const { t: fr, locale } = useLocale();
  // montages commencés dans ce navigateur : leur nombre s'affiche à côté de « Atelier »
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const started = inProgress(store).length;
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.headerInner}`}>
        <div className={styles.left}>
          <Link href={localeHref(locale, "/")} className={styles.home} aria-label={fr.nav.home}>
            <Logo />
          </Link>
          <nav className={styles.nav} aria-label={fr.nav.main}>
            <Link href={localeHref(locale, "/catalogue/")}>{fr.nav.catalogue}</Link>
            <Link href="/atelier/">
              {fr.nav.workshop}
              {started > 0 && (
                <>
                  <span className={styles.count}>{started}</span>
                  <span className={styles.srOnly}> {fr.nav.workshopCount(started)}</span>
                </>
              )}
            </Link>
          </nav>
        </div>
        <div className={styles.tools}>
          <LanguageSwitch />
          <ThemeSwitch />
          <a href={GITHUB_URL} className={styles.github} target="_blank" rel="noopener" aria-label={stars === null ? fr.nav.github : fr.nav.githubStars(stars)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
            </svg>
            {/* pas de « 0 » : le compteur n'apparaît qu'à la première étoile */}
            {!!stars && <span aria-hidden="true">{stars}</span>}
          </a>
        </div>
      </div>
    </header>
  );
}
