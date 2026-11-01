import styles from "./SiteChrome.module.css";
import { fr } from "@/i18n/fr";
import { GITHUB_URL } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`wrap ${styles.footerInner}`}>
        <p className={styles.disclaimer}>{fr.footer.disclaimer}</p>
        <p className={styles.links}>
          <a href={GITHUB_URL} target="_blank" rel="noopener">
            {fr.footer.source}
          </a>
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
