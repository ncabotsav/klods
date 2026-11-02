"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import styles from "./CatalogueApp.module.css";
import { SetGrid } from "./SetCard";
import { createSearch, type SearchEntry } from "@/lib/search";
import { loadSearchIndex } from "@/lib/search-index";
import { filterEntries, PAGE_SIZE, type CatalogueFilters, type PartsBucket, type SortKey } from "@/lib/catalogue-filters";
import { fr } from "@/i18n/fr";

type Theme = { name: string; slug: string; count: number };
/** `first` : la première page, rendue au build ; le catalogue complet arrive ensuite par /recherche.json. */
type Props = { first: SearchEntry[]; total: number; themes: Theme[]; decades: number[] };

const SORTS = Object.keys(fr.catalogue.sorts) as SortKey[];
const BUCKETS = Object.keys(fr.catalogue.partsBuckets) as PartsBucket[];

/** Lit les filtres dans l'adresse (« ?theme=technic&annees=1990&tri=recent »). */
function readFilters(p: URLSearchParams, themes: Theme[]): CatalogueFilters {
  const theme = themes.find((t) => t.slug === p.get("theme"))?.name ?? "";
  const decade = Number(p.get("annees")) || 0;
  const parts = (BUCKETS as string[]).includes(p.get("pieces") ?? "") ? (p.get("pieces") as PartsBucket) : "";
  const sort = (SORTS as string[]).includes(p.get("tri") ?? "") ? (p.get("tri") as SortKey) : "number";
  return { q: p.get("q") ?? "", theme, decade, parts, withSteps: p.get("etapes") === "1", sort };
}

/** Écrit les filtres dans l'adresse sans recharger la page : un lien copié garde la sélection. */
function writeFilters(f: CatalogueFilters, themes: Theme[]) {
  const q = new URLSearchParams();
  if (f.q) q.set("q", f.q);
  const slug = themes.find((t) => t.name === f.theme)?.slug;
  if (slug) q.set("theme", slug);
  if (f.decade) q.set("annees", String(f.decade));
  if (f.parts) q.set("pieces", f.parts);
  if (f.withSteps) q.set("etapes", "1");
  if (f.sort !== "number") q.set("tri", f.sort);
  window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
}

/** Catalogue filtrable : recherche, thème, années, taille, avec étapes, tri, et « Afficher plus ». */
export default function CatalogueApp({ first, total, themes, decades }: Props) {
  const [all, setAll] = useState<SearchEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadSearchIndex().then((list) => alive && setAll(list), () => {});
    return () => {
      alive = false;
    };
  }, []);
  const entries = all ?? first;
  const id = useId();
  const params = useSearchParams();
  const [filters, setFilters] = useState(() => readFilters(new URLSearchParams(params.toString()), themes));
  const [limit, setLimit] = useState(PAGE_SIZE);
  const engine = useMemo(() => createSearch(entries), [entries]);
  const shown = useMemo(() => filterEntries(entries, filters, engine), [entries, filters, engine]);

  const update = (patch: Partial<CatalogueFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    setLimit(PAGE_SIZE);
    writeFilters(next, themes);
  };
  const active = filters.q || filters.theme || filters.decade || filters.parts || filters.withSteps;

  return (
    <div className={styles.app}>
      <form className={styles.filters} aria-label={fr.catalogue.filters} onSubmit={(e) => e.preventDefault()} role="search">
        <div className={`${styles.field} ${styles.wide}`}>
          <label htmlFor={`${id}-q`}>{fr.search.label}</label>
          <input id={`${id}-q`} type="search" value={filters.q} placeholder={fr.search.placeholder} onChange={(e) => update({ q: e.target.value })} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-theme`}>{fr.catalogue.theme}</label>
          <select id={`${id}-theme`} value={filters.theme} onChange={(e) => update({ theme: e.target.value })}>
            <option value="">{fr.catalogue.allThemes}</option>
            {themes.map((t) => (
              <option key={t.slug} value={t.name}>
                {t.name} ({t.count})
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-decade`}>{fr.catalogue.decade}</label>
          <select id={`${id}-decade`} value={filters.decade} onChange={(e) => update({ decade: Number(e.target.value) })}>
            <option value={0}>{fr.catalogue.allDecades}</option>
            {decades.map((d) => (
              <option key={d} value={d}>
                {fr.catalogue.decadeLabel(d)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-parts`}>{fr.catalogue.parts}</label>
          <select id={`${id}-parts`} value={filters.parts} onChange={(e) => update({ parts: e.target.value as PartsBucket | "" })}>
            <option value="">{fr.catalogue.anyParts}</option>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>
                {fr.catalogue.partsBuckets[b]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-sort`}>{fr.catalogue.sort}</label>
          <select id={`${id}-sort`} value={filters.sort} onChange={(e) => update({ sort: e.target.value as SortKey })}>
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {fr.catalogue.sorts[s]}
              </option>
            ))}
          </select>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={filters.withSteps} onChange={(e) => update({ withSteps: e.target.checked })} />
          {fr.catalogue.withSteps}
        </label>
      </form>

      <div className={styles.bar}>
        <p role="status" aria-live="polite">
          {fr.catalogue.count(all ? shown.length : total, total)}
        </p>
        {active ? (
          <button type="button" className={styles.reset} onClick={() => update({ q: "", theme: "", decade: 0, parts: "", withSteps: false })}>
            {fr.catalogue.reset}
          </button>
        ) : null}
      </div>

      {shown.length ? <SetGrid entries={shown.slice(0, limit)} headingLevel={2} eager={4} /> : <p className={styles.empty}>{fr.catalogue.empty}</p>}

      {shown.length > limit && (
        <p className={styles.more}>
          <button type="button" className="btn" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            {fr.catalogue.more}
          </button>
        </p>
      )}
    </div>
  );
}
