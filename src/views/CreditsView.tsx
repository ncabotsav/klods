import type { Metadata } from "next";
import TextPage from "@/components/TextPage";
import styles from "@/components/TextPage.module.css";
import { dictFor, type Locale } from "@/i18n";
import { bilingual, TEXT_PAGES } from "@/lib/seo";

export const creditsMetadata = (locale: Locale): Metadata => ({ title: dictFor(locale).credits.title, description: dictFor(locale).credits.lead, alternates: bilingual(locale, TEXT_PAGES.credits) });

const links = (fr: ReturnType<typeof dictFor>) => [
  { label: fr.about.omr, href: "https://library.ldraw.org/omr" },
  { label: fr.about.library, href: "https://library.ldraw.org/" },
  { label: fr.about.rebrickable, href: "https://rebrickable.com/" },
  { label: "three.js", href: "https://threejs.org/" },
  { label: "Next.js", href: "https://nextjs.org/" },
  { label: fr.about.bygga, href: "https://www.usebygga.com/" },
];

export default function CreditsView({ locale }: { locale: Locale }) {
  const fr = dictFor(locale);
  const t = fr.credits;
  return (
    <TextPage content={t}>
      <section className={styles.section}>
        <h2>{t.links}</h2>
        <ul className={styles.links}>
          {links(fr).map((l) => (
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
