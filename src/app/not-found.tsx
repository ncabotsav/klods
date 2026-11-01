import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/ComingSoon.module.css";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { title: fr.notFound.title };

export default function NotFound() {
  return (
    <div className={`wrap ${styles.box}`}>
      <p className="eyebrow">404</p>
      <h1 className={styles.title}>{fr.notFound.title}</h1>
      <p className={styles.body}>{fr.notFound.body}</p>
      <Link href="/" className="btn btn-primary">
        {fr.notFound.back}
      </Link>
    </div>
  );
}
