"use client";

import styles from "./SiteChrome.module.css";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n";
import { asset, BASE_PATH } from "@/lib/site";

/**
 * Lien vers l'autre langue, discret, dans l'en-tête.
 * - Page d'une langue (accueil, fiche…) : va à la même page dans l'autre langue, lue dans les liens
 *   `hreflang` de la page (ils changent avec la page, même après une navigation interne).
 * - Page commune (montage, atelier…) : change la langue sur place, et la garde pour la suite.
 */
export default function LanguageSwitch() {
  const { t, fixed, setLocale } = useLocale();
  const other = t.nav.otherLocale as Locale;

  const go = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const alternate = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${other}"]`);
    setLocale(other);
    if (fixed && alternate) {
      e.preventDefault();
      const url = new URL(alternate.href);
      // chargement complet voulu : l'autre langue a sa propre mise en page, et les fiches n'ont pas de navigation interne
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      const target = BASE_PATH && !url.pathname.startsWith(`${BASE_PATH}/`) ? asset(url.pathname) : url.pathname;
      window.location.assign(`${target}${url.search}`);
    } else if (!fixed) {
      e.preventDefault();
    }
  };

  // sans JavaScript : l'accueil de l'autre langue
  return (
    <a href={asset(other === "fr" ? "/" : "/en/")} hrefLang={other} lang={other} className={styles.lang} onClick={go} aria-label={t.nav.otherLabel}>
      {t.nav.otherCode}
    </a>
  );
}
