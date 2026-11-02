import type { Metadata } from "next";
import { Suspense } from "react";
import styles from "./Catalogue.module.css";
import CatalogueApp from "@/components/catalog/CatalogueApp";
import { SetGrid } from "@/components/catalog/SetCard";
import ThemeLinks from "@/components/catalog/ThemeLinks";
import { allThemes, firstYear, searchEntries } from "@/lib/catalog-server";
import { decadesOf, filterEntries, PAGE_SIZE } from "@/lib/catalogue-filters";
import { fr } from "@/i18n/fr";

const t = fr.catalogue;

export function generateMetadata(): Metadata {
  const n = searchEntries().length;
  return { title: t.title, description: t.lead(n, firstYear()), alternates: { canonical: "/catalogue/" } };
}

export default function CataloguePage() {
  const entries = searchEntries();
  const themes = allThemes();
  // rendu statique de la première page (moteurs de recherche, premier affichage), remplacé par le catalogue filtrable
  const first = filterEntries(entries, { q: "", theme: "", decade: 0, parts: "", withSteps: false, sort: "number" }).slice(0, PAGE_SIZE);
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead(entries.length, firstYear())}</p>
      </div>
      <Suspense fallback={<SetGrid entries={first} />}>
        <CatalogueApp entries={entries} themes={themes} decades={decadesOf(entries)} />
      </Suspense>
      <ThemeLinks />
    </div>
  );
}
