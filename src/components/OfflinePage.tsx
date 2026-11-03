"use client";

import Link from "next/link";
import styles from "@/components/TextPage.module.css";
import OfflineSets from "@/components/OfflineSets";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeHref } from "@/i18n";

/** Contenu de la page « Hors connexion », dans la langue choisie. */
export default function OfflinePage() {
  const { t: fr, locale } = useLocale();
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
        <Link href={localeHref(locale, "/")}>{fr.notFound.back}</Link>
      </p>
    </div>
  );
}
