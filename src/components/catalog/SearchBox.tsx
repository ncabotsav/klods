"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./SearchBox.module.css";
import SetCover from "./SetCover";
import { createSearch, normalize, type SearchEntry } from "@/lib/search";
import { officialManualUrl } from "@/lib/catalog";
import { loadSearchIndex as loadIndex } from "@/lib/search-index";
import { fr } from "@/i18n/fr";

const MAX_RESULTS = 8;

type Props = { examples?: { label: string; query: string }[]; autoFocus?: boolean };

/**
 * Recherche d'un set par numéro ou par nom : les résultats s'affichent pendant la frappe,
 * Entrée ouvre le premier, flèche bas descend dans la liste.
 */
export default function SearchBox({ examples = [], autoFocus = false }: Props) {
  const id = useId();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  const engine = useMemo(() => (entries ? createSearch(entries) : null), [entries]);
  const hits = useMemo(() => (engine && query.trim() ? engine.search(query, MAX_RESULTS) : []), [engine, query]);
  const number = /^\d{3,}(-\d+)?$/.test(normalize(query).replace(" ", "-")) ? normalize(query).replace(" ", "-") : null;

  const prepare = () => {
    if (entries || failed) return;
    loadIndex().then(setEntries, () => setFailed(true));
  };

  useEffect(() => {
    if (autoFocus) input.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const typed = query.trim().length > 0;
  const status = !typed ? "" : failed ? fr.search.error : !entries ? fr.search.loading : hits.length ? fr.search.results(hits.length) : fr.search.none;

  return (
    <div className={styles.box}>
      <form
        role="search"
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (hits[0]) router.push(`/set/${hits[0].entry.n}/`);
        }}
      >
        <label htmlFor={`${id}-q`} className={styles.label}>
          {fr.search.label}
        </label>
        <div className={styles.row}>
          <input
            ref={input}
            id={`${id}-q`}
            className={styles.input}
            type="search"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            placeholder={fr.search.placeholder}
            value={query}
            aria-describedby={`${id}-status`}
            onFocus={prepare}
            onChange={(e) => {
              prepare();
              setQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && hits.length) {
                e.preventDefault();
                list.current?.querySelector("a")?.focus();
              }
            }}
          />
          <button type="submit" className="btn btn-primary">
            {fr.search.submit}
          </button>
        </div>
      </form>

      {examples.length > 0 && !typed && (
        <p className={styles.examples}>
          <span>{fr.home.examples}</span>
          {examples.map((ex) => (
            <button
              key={ex.query}
              type="button"
              className={styles.example}
              onClick={() => {
                prepare();
                setQuery(ex.query);
                input.current?.focus();
              }}
            >
              {ex.label}
            </button>
          ))}
        </p>
      )}

      <p id={`${id}-status`} className={styles.status} role="status" aria-live="polite">
        {status}
      </p>

      {hits.length > 0 && (
        <ul
          ref={list}
          className={styles.results}
          onKeyDown={(e) => {
            const links = [...(list.current?.querySelectorAll("a") ?? [])];
            const i = links.indexOf(document.activeElement as HTMLAnchorElement);
            if (e.key === "ArrowDown" && i < links.length - 1) {
              e.preventDefault();
              links[i + 1].focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (i > 0) links[i - 1].focus();
              else input.current?.focus();
            } else if (e.key === "Escape") {
              input.current?.focus();
            }
          }}
        >
          {hits.map(({ entry }) => (
            <li key={entry.n}>
              <Link href={`/set/${entry.n}/`} className={styles.result}>
                <span className={styles.thumb}>
                  <SetCover number={entry.n} hasCover={entry.c} />
                </span>
                <span className={styles.resultText}>
                  <span className={styles.resultName}>{entry.t}</span>
                  <span className={styles.resultMeta}>
                    {[entry.n, entry.h, entry.y].filter(Boolean).join(" · ")} · {entry.e ? fr.set.steps(entry.s) : fr.set.noSteps}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {typed && entries && !hits.length && number && (
        <p className={styles.missing}>
          {fr.search.noneNumber(number)}{" "}
          <a href={officialManualUrl(number)} target="_blank" rel="noopener">
            {fr.search.official}
          </a>
        </p>
      )}
    </div>
  );
}
