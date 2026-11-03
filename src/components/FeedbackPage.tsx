"use client";

import styles from "@/components/TextPage.module.css";
import FeedbackForm from "@/components/FeedbackForm";
import { useT } from "@/i18n/LocaleProvider";

/** Page « Envoyer un retour », dans la langue choisie. */
export default function FeedbackPage() {
  const t = useT().feedback;
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
