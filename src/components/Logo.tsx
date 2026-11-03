import styles from "./SiteChrome.module.css";

/** La marque : une brique 2 × 1 vue de face, suivie du nom. */
export default function Logo() {
  return (
    <span className={styles.logo}>
      <svg className={styles.mark} viewBox="0 0 28 20" aria-hidden="true">
        <rect x="4" y="0" width="7" height="5" rx="1.5" />
        <rect x="17" y="0" width="7" height="5" rx="1.5" />
        <rect x="0" y="4" width="28" height="16" rx="3" />
      </svg>
      <span className={styles.logoName}>Klods</span>
    </span>
  );
}
