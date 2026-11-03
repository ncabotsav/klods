"use client";

import styles from "./SiteChrome.module.css";
import { useLocale } from "@/i18n/LocaleProvider";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/i18n";
import { asset, BASE_PATH } from "@/lib/site";

/**
 * Sélecteur de langue de l'en-tête, en deux segments : FR | EN. La langue de la page est remplie et
 * annoncée comme actuelle ; l'autre est un lien. Chaque langue porte son nom dans sa propre langue, précédé
 * du code affiché (« EN, English ») : le nom lu commence par le texte visible.
 * - Page d'une langue (accueil, fiche…) : le lien va à la même page dans l'autre langue, lue dans les
 *   liens `hreflang` de la page (ils changent avec la page, même après une navigation interne).
 * - Page commune (montage, atelier…) : change la langue sur place, et la garde pour la suite.
 */
export default function LanguageSwitch() {
  const { t, locale, fixed, setLocale } = useLocale();

  const go = (target: Locale) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    const alternate = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${target}"]`);
    setLocale(target);
    if (fixed && alternate) {
      e.preventDefault();
      const url = new URL(alternate.href);
      const path = BASE_PATH && !url.pathname.startsWith(`${BASE_PATH}/`) ? asset(url.pathname) : url.pathname;
      // chargement complet voulu : l'autre langue a sa propre mise en page, et les fiches n'ont pas de navigation interne
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`${path}${url.search}`);
    } else if (!fixed) {
      e.preventDefault();
    }
  };

  return (
    <div role="group" aria-label={t.nav.language} className={styles.langs}>
      {LOCALES.map((l) =>
        l === locale ? (
          <span key={l} lang={l} className={styles.langCurrent} aria-current="true" aria-label={`${LOCALE_NAMES[l].code}, ${LOCALE_NAMES[l].name}`}>
            {LOCALE_NAMES[l].code}
          </span>
        ) : (
          // sans JavaScript : l'accueil de l'autre langue
          <a key={l} href={asset(l === "fr" ? "/" : "/en/")} hrefLang={l} lang={l} className={styles.langOther} onClick={go(l)} aria-label={`${LOCALE_NAMES[l].code}, ${LOCALE_NAMES[l].name}`} title={LOCALE_NAMES[l].name}>
            {LOCALE_NAMES[l].code}
          </a>
        ),
      )}
    </div>
  );
}
