import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./Catalogue.module.css";
import ThemeLinks from "@/components/catalog/ThemeLinks";
import { SetGrid } from "@/components/catalog/SetCard";
import { findTheme, searchEntries, themeIn } from "@/lib/catalog-server";
import { filterEntries } from "@/lib/catalogue-filters";
import { dictFor, localeHref, type Locale } from "@/i18n";
import { bilingual } from "@/lib/seo";

/** Chemins d'une page de thème dans les deux langues (le nom du thème, donc son adresse, change). */
function themePaths(slug: string, locale: Locale) {
  const other: Locale = locale === "fr" ? "en" : "fr";
  const twin = themeIn(slug, locale, other);
  const paths = { fr: "", en: "" };
  paths[locale] = `/catalogue/${slug}/`;
  paths[other] = twin ? `/catalogue/${twin.slug}/` : "/catalogue/";
  return paths;
}

export function themeMetadata(locale: Locale, slug: string): Metadata {
  const fr = dictFor(locale);
  const theme = findTheme(slug, locale);
  if (!theme) return {};
  return { title: fr.catalogue.themeTitle(theme.name), description: fr.catalogue.themeDescription(theme.name, theme.count), alternates: bilingual(locale, themePaths(slug, locale)) };
}

/** Page d'un thème de premier niveau : tous ses sets, les plus récents d'abord. */
export default function ThemeView({ locale, slug }: { locale: Locale; slug: string }) {
  const fr = dictFor(locale);
  const theme = findTheme(slug, locale);
  if (!theme) notFound();
  const sets = filterEntries(searchEntries(locale), { q: "", theme: theme.name, decade: 0, parts: "", withSteps: false, sort: "recent" });
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.head}>
        <p className="eyebrow">
          <Link href={localeHref(locale, "/catalogue/")}>{fr.catalogue.back}</Link>
        </p>
        <h1 className={styles.title}>{fr.catalogue.themeTitle(theme.name)}</h1>
        <p className={styles.lead}>{fr.catalogue.themeLead(theme.count, theme.name)}</p>
      </div>
      <SetGrid locale={locale} entries={sets} headingLevel={2} eager={4} />
      <ThemeLinks locale={locale} />
    </div>
  );
}
