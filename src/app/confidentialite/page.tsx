import type { Metadata } from "next";
import styles from "@/components/TextPage.module.css";
import { fr } from "@/i18n/fr";

const t = fr.privacy;

export const metadata: Metadata = { title: t.title, description: t.lead, alternates: { canonical: "/confidentialite/" } };

export default function PrivacyPage() {
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>
      </div>
      {t.sections.map((s) => (
        <section key={s.title} className={styles.section}>
          <h2>{s.title}</h2>
          {s.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
      <p className={styles.small}>{t.updated}</p>
    </div>
  );
}
