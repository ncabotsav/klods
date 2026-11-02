import styles from "./SiteChrome.module.css";
import { fr } from "@/i18n/fr";
import { GITHUB_URL } from "@/lib/site";

/** Bandeau de la préversion, sous l'en-tête : le site est en test, les retours passent par GitHub. */
export default function PreviewBanner() {
  return (
    <aside className={styles.preview} aria-label={fr.preview.label}>
      <p className={`wrap ${styles.previewInner}`}>
        <span className={styles.previewLabel}>{fr.preview.label}</span>
        <span>{fr.preview.body}</span>
        <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noopener">
          {fr.preview.link}
        </a>
      </p>
    </aside>
  );
}
