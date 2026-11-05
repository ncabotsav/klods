"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./SearchBox.module.css";
import SetCover from "./SetCover";
import SearchIcon from "./SearchIcon";
import { createSearch, normalize, type SearchEntry } from "@/lib/search";
import { officialManualUrl } from "@/lib/catalog";
import { loadSearchIndex as loadIndex } from "@/lib/search-index";
import { setPageHref } from "@/lib/site";
import { useLocale } from "@/i18n/LocaleProvider";

const MAX_RESULTS = 8;

type Props = { examples?: { label: string; query: string }[]; autoFocus?: boolean };

/**
 * Recherche d'un set par numéro ou par nom : les résultats s'affichent pendant la frappe,
 * Entrée ouvre le premier, flèche bas descend dans la liste.
 */
export default function SearchBox({ examples = [], autoFocus = false }: Props) {
  const { t: fr, locale } = useLocale();
  const id = useId();
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
    loadIndex(locale).then(setEntries, () => setFailed(true));
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
          if (hits[0]) window.location.assign(setPageHref(locale, hits[0].entry.n));
        }}
      >
        {/* étiquette lue par les lecteurs d'écran : le sous-titre de la page la dit déjà à l'écran */}
        <label htmlFor={`${id}-q`} className={styles.srOnly}>
          {fr.search.label}
        </label>
        <span className={styles.field}>
          <SearchIcon className={styles.icon} />
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
          <button type="submit" className={styles.submit} aria-label={fr.search.submit} title={fr.search.submit}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </span>
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
              <a href={setPageHref(locale, entry.n)} className={styles.result}>
                <span className={styles.thumb}>
                  <SetCover locale={locale} number={entry.n} hasCover={entry.c} />
                </span>
                <span className={styles.resultText}>
                  <span className={styles.resultName}>{entry.t}</span>
                  <span className={styles.resultMeta}>
                    {[entry.n, entry.h, entry.y].filter(Boolean).join(" · ")} · {entry.e ? fr.set.steps(entry.s) : fr.set.noSteps}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {typed && entries && !hits.length && number && (
        <p className={styles.missing}>
          {fr.search.noneNumber(number)}{" "}
          <a href={officialManualUrl(number, locale)} target="_blank" rel="noopener">
            {fr.search.official}
          </a>
        </p>
      )}
    </div>
  );
}
