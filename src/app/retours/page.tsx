import type { Metadata } from "next";
import styles from "@/components/TextPage.module.css";
import FeedbackForm from "@/components/FeedbackForm";
import { fr } from "@/i18n/fr";

const t = fr.feedback;

export const metadata: Metadata = { title: t.title, description: t.lead, robots: { index: false }, alternates: { canonical: "/retours/" } };

export default function FeedbackPage() {
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>
      </div>
      <FeedbackForm />
    </div>
  );
}
