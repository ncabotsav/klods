import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../Catalogue.module.css";
import ThemeLinks from "@/components/catalog/ThemeLinks";
import { SetGrid } from "@/components/catalog/SetCard";
import { findTheme, searchEntries, themeParams } from "@/lib/catalog-server";
import { filterEntries } from "@/lib/catalogue-filters";
import { fr } from "@/i18n/fr";

/** Une page par thème de premier niveau, construite au build. */
export const dynamicParams = false;
export const generateStaticParams = themeParams;

type Props = { params: Promise<{ theme: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const theme = findTheme((await params).theme);
  if (!theme) return {};
  return { title: fr.catalogue.themeTitle(theme.name), description: fr.catalogue.themeDescription(theme.name, theme.count), alternates: { canonical: `/catalogue/${theme.slug}/` } };
}

export default async function ThemePage({ params }: Props) {
  const theme = findTheme((await params).theme);
  if (!theme) notFound();
  const sets = filterEntries(searchEntries(), { q: "", theme: theme.name, decade: 0, parts: "", withSteps: false, sort: "recent" });
  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.head}>
        <p className="eyebrow">
          <Link href="/catalogue/">{fr.catalogue.back}</Link>
        </p>
        <h1 className={styles.title}>{fr.catalogue.themeTitle(theme.name)}</h1>
        <p className={styles.lead}>{fr.catalogue.themeLead(theme.count, theme.name)}</p>
      </div>
      <SetGrid entries={sets} headingLevel={2} eager={4} />
      <ThemeLinks />
    </div>
  );
}
