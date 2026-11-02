import Link from "next/link";
import styles from "./SiteChrome.module.css";
import { fr } from "@/i18n/fr";
import { GITHUB_URL } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.footerInner}`}>
        <p className={styles.disclaimer}>{fr.footer.disclaimer}</p>
        <p className={styles.links}>
          <Link href="/a-propos/">{fr.footer.about}</Link>
          <span aria-hidden="true">·</span>
          <Link href="/confidentialite/">{fr.footer.privacy}</Link>
          <span aria-hidden="true">·</span>
          <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noopener">
            {fr.footer.report}
          </a>
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
