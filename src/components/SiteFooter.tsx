"use client";

import Link from "next/link";
import styles from "./SiteChrome.module.css";
import { useLocale } from "@/i18n/LocaleProvider";
import { GITHUB_URL } from "@/lib/site";
import { textPageHref } from "@/lib/seo";

/** Pied de page de toutes les pages, dans la langue de la page : avertissement de marque, liens, crédits. */
export default function SiteFooter() {
  const { t: fr, locale } = useLocale();
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.footerInner}`}>
        <p className={styles.disclaimer}>{fr.footer.disclaimer}</p>
        <p className={styles.links}>
          <Link href={textPageHref("about", locale)}>{fr.footer.about}</Link>
          <span aria-hidden="true">·</span>
          <Link href={textPageHref("privacy", locale)}>{fr.footer.privacy}</Link>
          <span aria-hidden="true">·</span>
          <Link href={textPageHref("terms", locale)}>{fr.footer.terms}</Link>
          <span aria-hidden="true">·</span>
          <Link href={textPageHref("legal", locale)}>{fr.footer.legal}</Link>
          <span aria-hidden="true">·</span>
          <Link href={textPageHref("credits", locale)}>{fr.footer.credits}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/retours/">{fr.footer.report}</Link>
          <span aria-hidden="true">·</span>
          <a href={GITHUB_URL} target="_blank" rel="noopener">
            {fr.footer.source}
          </a>
          <span aria-hidden="true">·</span>
          <span>
            {fr.footer.models}{" "}
            <a href="https://library.ldraw.org/omr" target="_blank" rel="noopener">
              LDraw OMR
            </a>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {fr.footer.setData}{" "}
            <a href="https://rebrickable.com/" target="_blank" rel="noopener">
              Rebrickable
            </a>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {fr.footer.inspired}{" "}
            <a href="https://www.usebygga.com/" target="_blank" rel="noopener">
              Bygga
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
}
