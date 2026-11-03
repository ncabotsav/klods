"use client";

import Link from "next/link";
import styles from "@/components/ComingSoon.module.css";
import MissingSet from "@/components/catalog/MissingSet";
import SearchBox from "@/components/catalog/SearchBox";
import { useLocale } from "@/i18n/LocaleProvider";
import { localeHref } from "@/i18n";

/** Contenu de la page 404, dans la langue de la page. */
export default function NotFoundContent() {
  const { t: fr, locale } = useLocale();
  return (
    <div className={`wrap ${styles.box}`}>
      <p className="eyebrow">404</p>
      <h1 className={styles.title}>{fr.notFound.title}</h1>
      <MissingSet />
      <p className={styles.body}>{fr.notFound.body}</p>
      <SearchBox />
      <p className={styles.actions}>
        <Link href={localeHref(locale, "/catalogue/")} className="btn">
          {fr.notFound.catalogue}
        </Link>
        <Link href={localeHref(locale, "/")} className="btn">
          {fr.notFound.back}
        </Link>
      </p>
    </div>
  );
}
