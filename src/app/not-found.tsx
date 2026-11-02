import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/ComingSoon.module.css";
import MissingSet from "@/components/catalog/MissingSet";
import SearchBox from "@/components/catalog/SearchBox";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: fr.notFound.title, robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <div className={`wrap ${styles.box}`}>
      <p className="eyebrow">404</p>
      <h1 className={styles.title}>{fr.notFound.title}</h1>
      <MissingSet />
      <p className={styles.body}>{fr.notFound.body}</p>
      <SearchBox />
      <p className={styles.actions}>
        <Link href="/catalogue/" className="btn">
          {fr.notFound.catalogue}
        </Link>
        <Link href="/" className="btn">
          {fr.notFound.back}
        </Link>
      </p>
    </div>
  );
}
