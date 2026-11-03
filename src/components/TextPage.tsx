import type { ReactNode } from "react";
import styles from "./TextPage.module.css";
import { CONTACT_EMAIL } from "@/lib/site";

type Section = { readonly title: string; readonly body: readonly string[] };
type Content = { readonly title: string; readonly lead: string; readonly sections: readonly Section[]; readonly updated?: string };

/** Un paragraphe, avec l'adresse de contact transformée en lien. */
function Paragraph({ text }: { text: string }) {
  const parts = text.split(CONTACT_EMAIL);
  return (
    <p>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}
        </span>
      ))}
    </p>
  );
}

/** Page de texte (mentions légales, confidentialité, conditions, crédits) : titre, sections, date. */
export default function TextPage({ content, children }: { content: Content; children?: ReactNode }) {
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>{content.title}</h1>
        <p className={styles.lead}>{content.lead}</p>
      </div>
      {content.sections.map((s) => (
        <section key={s.title} className={styles.section}>
          <h2>{s.title}</h2>
          {s.body.map((p) => (
            <Paragraph key={p} text={p} />
          ))}
        </section>
      ))}
      {children}
      {content.updated && <p className={styles.small}>{content.updated}</p>}
    </div>
  );
}
