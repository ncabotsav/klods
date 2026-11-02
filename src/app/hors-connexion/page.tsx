import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/TextPage.module.css";
import OfflineSets from "@/components/OfflineSets";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: fr.offline.title, robots: { index: false, follow: false } };

/** Montrée par le service worker quand une page demandée n'est ni sur le réseau ni en cache. */
export default function OfflinePage() {
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>{fr.offline.title}</h1>
        <p className={styles.lead}>{fr.offline.lead}</p>
      </div>
      <section className={styles.section}>
        <h2>{fr.offline.available}</h2>
        <OfflineSets />
      </section>
      <p className={styles.small}>{fr.offline.how}</p>
      <p>
        <Link href="/">{fr.notFound.back}</Link>
      </p>
    </div>
  );
}
