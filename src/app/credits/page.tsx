import type { Metadata } from "next";
import TextPage from "@/components/TextPage";
import styles from "@/components/TextPage.module.css";
import { fr } from "@/i18n/fr";

const t = fr.credits;

export const metadata: Metadata = { title: t.title, description: t.lead, alternates: { canonical: "/credits/" } };

const LINKS = [
  { label: fr.about.omr, href: "https://library.ldraw.org/omr" },
  { label: fr.about.library, href: "https://library.ldraw.org/" },
  { label: fr.about.rebrickable, href: "https://rebrickable.com/" },
  { label: "three.js", href: "https://threejs.org/" },
  { label: "Next.js", href: "https://nextjs.org/" },
  { label: fr.about.bygga, href: "https://www.usebygga.com/" },
];

export default function CreditsPage() {
  return (
    <TextPage content={t}>
      <section className={styles.section}>
        <h2>{t.links}</h2>
        <ul className={styles.links}>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noopener">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </TextPage>
  );
}
