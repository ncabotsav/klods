import type { Metadata } from "next";
import { Suspense } from "react";
import styles from "./Catalogue.module.css";
import CatalogueApp from "@/components/catalog/CatalogueApp";
import { SetGrid } from "@/components/catalog/SetCard";
import ThemeLinks from "@/components/catalog/ThemeLinks";
import { firstYear, searchEntries, themesByName } from "@/lib/catalog-server";
import { decadesOf, filterEntries, PAGE_SIZE } from "@/lib/catalogue-filters";
import { dictFor, type Locale } from "@/i18n";
import { bilingual } from "@/lib/seo";

export function catalogueMetadata(locale: Locale): Metadata {
  const t = dictFor(locale).catalogue;
  const n = searchEntries(locale).length;
  return { title: t.title, description: t.lead(n, firstYear()), alternates: bilingual(locale, { fr: "/catalogue/", en: "/catalogue/" }) };
}

/** Catalogue : la première page en dur (moteurs de recherche), puis le catalogue filtrable. */
export default function CatalogueView({ locale }: { locale: Locale }) {
  const t = dictFor(locale).catalogue;
  const entries = searchEntries(locale);
  const themes = themesByName(locale);
  // rendu statique de la première page (moteurs de recherche, premier affichage), remplacé par le catalogue filtrable
  const first = filterEntries(entries, { q: "", theme: "", decade: 0, parts: "", withSteps: false, sort: "number" }).slice(0, PAGE_SIZE);
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead(entries.length, firstYear())}</p>
      </div>
      <Suspense fallback={<SetGrid locale={locale} entries={first} headingLevel={2} eager={4} />}>
        <CatalogueApp first={first} total={entries.length} themes={themes} decades={decadesOf(entries)} />
      </Suspense>
      <ThemeLinks locale={locale} />
    </div>
  );
}
