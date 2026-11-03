import type { Metadata } from "next";
import Link from "next/link";
import styles from "./Home.module.css";
import ResumeBuilds from "@/components/ResumeBuilds";
import SearchBox from "@/components/catalog/SearchBox";
import FeaturedGrid from "@/components/catalog/FeaturedGrid";
import { allSets, featuredByTheme, searchEntries } from "@/lib/catalog-server";
import { dictFor, localeHref, type Locale } from "@/i18n";
import { bilingual } from "@/lib/seo";

export const homeMetadata = (locale: Locale): Metadata => ({ alternates: bilingual(locale, { fr: "/", en: "/" }) });

/** Accueil : recherche, montages en cours, comment ça marche, sets à la une par thème. */
export default function HomeView({ locale }: { locale: Locale }) {
  const t = dictFor(locale).home;
  const featured = featuredByTheme(locale);
  const entries = new Map(searchEntries(locale).map((e) => [e.n, e]));
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
                <Link href={localeHref(locale, `/catalogue/${theme.slug}/`)}>{t.seeTheme(theme.name)}</Link>
              </div>
              <FeaturedGrid locale={locale} pool={sets.map((s) => entries.get(s.number)!)} label={theme.name} />
            </div>
          ))}
          <p>
            <Link href={localeHref(locale, "/catalogue/")} className="btn">
              {t.catalogueCta(allSets().length)}
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
