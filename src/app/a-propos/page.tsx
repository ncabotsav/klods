import type { Metadata } from "next";
import styles from "@/components/TextPage.module.css";
import { allSets, firstYear } from "@/lib/catalog-server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GITHUB_URL } from "@/lib/site";
import { fr } from "@/i18n/fr";

const t = fr.about;

export const metadata: Metadata = { title: t.title, description: t.lead, alternates: { canonical: "/a-propos/" } };

/** Date de la bibliothèque de pièces LDraw utilisée par le build (« 2026-10 »), si les données sont là. */
function libraryDate(): string | null {
  try {
    return JSON.parse(readFileSync(path.join(process.cwd(), "public", "data", "sets.json"), "utf8")).ldrawLibrary || null;
  } catch {
    return null;
  }
}

export default function AboutPage() {
  const library = libraryDate();
  const count = allSets().length;
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
      <section className={styles.section}>
        <h2>{t.links}</h2>
        <ul className={styles.links}>
          <li>
            <a href="https://library.ldraw.org/omr" target="_blank" rel="noopener">
              {t.omr}
            </a>
          </li>
          <li>
            <a href="https://library.ldraw.org/" target="_blank" rel="noopener">
              {t.library}
            </a>
          </li>
          <li>
            <a href="https://rebrickable.com/" target="_blank" rel="noopener">
              {t.rebrickable}
            </a>
          </li>
          <li>
            <a href="https://www.usebygga.com/" target="_blank" rel="noopener">
              {t.bygga}
            </a>
          </li>
          <li>
            <a href={GITHUB_URL} target="_blank" rel="noopener">
              {t.code}
            </a>
          </li>
        </ul>
        <p className={styles.small}>
          {count > 0 && fr.catalogue.lead(count, firstYear())} {library && t.libraryLine(library)}
        </p>
      </section>
    </div>
  );
}
