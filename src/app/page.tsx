import type { Metadata } from "next";
import Link from "next/link";
import styles from "./home.module.css";
import ResumeBuilds from "@/components/ResumeBuilds";
import SearchBox from "@/components/catalog/SearchBox";
import { SetGrid } from "@/components/catalog/SetCard";
import { allSets, featuredByTheme, searchEntries } from "@/lib/catalog-server";
import { fr } from "@/i18n/fr";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  const t = fr.home;
  const featured = featuredByTheme();
  const entries = new Map(searchEntries().map((e) => [e.n, e]));
  // exemples : le numéro d'un set à la une, le nom d'un autre, et un thème
  const picks = featured.flatMap((g) => g.sets);
  const examples = [
    picks[0] && { label: picks[0].number.replace(/-1$/, ""), query: picks[0].number.replace(/-1$/, "") },
    picks[1] && { label: picks[1].name, query: picks[1].name },
    featured[1] && { label: featured[1].theme.name, query: featured[1].theme.name },
  ].filter((x): x is { label: string; query: string } => Boolean(x));

  return (
    <div className={`wrap ${styles.page}`}>
      <section className={styles.hero}>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>
        <SearchBox examples={examples} />
      </section>

      <ResumeBuilds />

      <section className={styles.how} aria-labelledby="comment">
        <h2 id="comment" className={styles.howTitle}>
          {t.howTitle}
        </h2>
        <ol className={styles.steps}>
          {t.steps.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.stepNum}>{i + 1}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {featured.length > 0 && (
        <section className={styles.how} aria-labelledby="themes">
          <h2 id="themes" className={styles.howTitle}>
            {t.featuredTitle}
          </h2>
          {featured.map(({ theme, sets }) => (
            <div key={theme.slug} className={styles.theme}>
              <div className={styles.themeHead}>
                <h3 className={styles.themeTitle}>{theme.name}</h3>
                <Link href={`/catalogue/${theme.slug}/`}>{t.seeTheme(theme.name)}</Link>
              </div>
              <SetGrid entries={sets.map((s) => entries.get(s.number)!)} label={theme.name} />
            </div>
          ))}
          <p>
            <Link href="/catalogue/" className="btn">
              {t.catalogueCta(allSets().length)}
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
