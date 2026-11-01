import Link from "next/link";
import styles from "./ComingSoon.module.css";
import { fr } from "@/i18n/fr";

/** Page d'attente pour une section prévue dans un sprint suivant. */
export default function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className={`wrap ${styles.box}`}>
      <p className="eyebrow">Bientôt</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>{body}</p>
      <Link href="/" className="btn">
        {fr.soon.back}
      </Link>
    </div>
  );
}
