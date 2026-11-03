"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import styles from "./Workshop.module.css";
import ResumeBuilds from "@/components/ResumeBuilds";
import SetCover from "@/components/catalog/SetCover";
import { exportProgress, finishedBuilds, formatDuration, getServerSnapshot, getSnapshot, importProgress, inProgress, subscribe, workshopTotals } from "@/lib/progress";
import { loadSearchIndex } from "@/lib/search-index";
import type { SearchEntry } from "@/lib/search";
import { buildPageHref } from "@/lib/site";
import { fr } from "@/i18n/fr";

const t = fr.workshop;

/**
 * Mon atelier : tout ce qui vient de la progression gardée dans ce navigateur (src/lib/progress.ts).
 * Chiffres, montages en cours, vitrine des sets terminés, et sauvegarde dans un fichier.
 */
export default function WorkshopApp() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<Map<string, SearchEntry>>(new Map());
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'atelier n'existe qu'au navigateur
    setReady(true);
    // couvertures et nombre de pièces, lus dans l'index de recherche
    loadSearchIndex()
      .then((list) => setEntries(new Map(list.map((e) => [e.n, e]))))
      .catch(() => {});
  }, []);

  const done = finishedBuilds(store);
  const started = inProgress(store);
  const totals = workshopTotals(store);
  const empty = !done.length && !started.length;

  const save = () => {
    const url = URL.createObjectURL(new Blob([exportProgress(getSnapshot())], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = t.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const open = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const n = importProgress(await file.text());
    setMessage(n === null ? t.importError : n === 0 ? t.importNone : t.imported(n));
  };

  return (
    <div className={`wrap ${styles.page}`}>
      <div className={styles.head}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.lead}>{t.lead}</p>
      </div>

      {ready && empty && (
        <section className={styles.empty} aria-labelledby="atelier-vide">
          <h2 id="atelier-vide">{t.emptyTitle}</h2>
          <p>{t.emptyBody}</p>
          <p>
            <Link className="btn btn-primary" href="/catalogue/">
              {t.emptyCta}
            </Link>
          </p>
        </section>
      )}

      {ready && !empty && (
        <section aria-labelledby="atelier-chiffres">
          <h2 id="atelier-chiffres" className={styles.srOnly}>
            {t.stats}
          </h2>
          <dl className={styles.stats}>
            <div>
              <dt>{t.finished(totals.finished)}</dt>
              <dd>{totals.finished}</dd>
            </div>
            <div>
              <dt>{t.steps(totals.steps)}</dt>
              <dd>{totals.steps}</dd>
            </div>
            <div>
              <dt>{t.time}</dt>
              <dd>{formatDuration(totals.activeMs)}</dd>
            </div>
          </dl>
        </section>
      )}

      {/* toujours monté : le bandeau « Annuler » doit survivre au retrait du dernier montage */}
      {ready && <ResumeBuilds limit={Infinity} title={t.inProgress} />}

      {ready && done.length > 0 && (
        <section className={styles.section} aria-labelledby="atelier-vitrine">
          <div>
            <h2 id="atelier-vitrine" className={styles.sectionTitle}>
              {t.shelf}
            </h2>
            <p className={styles.muted}>{t.shelfLead}</p>
          </div>
          <ul className={styles.shelf}>
            {done.map((p) => {
              const entry = entries.get(p.number);
              return (
                <li key={`${p.number}/${p.model}`} className={styles.item}>
                  <SetCover number={p.number} hasCover={!!entry?.c} />
                  <div className={styles.itemText}>
                    <h3 className={styles.name}>
                      <Link href={`/set/${p.number}/`} aria-label={t.setPage(p.name)}>
                        {p.name}
                      </Link>
                    </h3>
                    <p className={styles.meta}>
                      {p.number}
                      {p.model !== "principal" ? ` · ${p.modelName}` : ""}
                    </p>
                    {p.finishedMs !== null && <p className={styles.meta}>{t.builtIn(formatDuration(p.finishedMs))}</p>}
                    {p.finishedAt && <p className={styles.meta}>{t.finishedOn(p.finishedAt)}</p>}
                    <a className={styles.rebuild} href={buildPageHref(`/set/${p.number}/monter/${p.model === "principal" ? "" : `?modele=${encodeURIComponent(p.model)}`}`)} aria-label={t.rebuildLabel(p.name)}>
                      {t.rebuild}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {ready && (
        <section className={styles.save} aria-labelledby="atelier-sauvegarde">
          <h2 id="atelier-sauvegarde" className={styles.sectionTitle}>
            {t.saveTitle}
          </h2>
          <p className={styles.muted}>{t.saveBody}</p>
          <div className={styles.actions}>
            {!empty && (
              <button type="button" className="btn" onClick={save}>
                {t.export}
              </button>
            )}
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              {t.import}
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={open} />
          </div>
          <p role="status" className={styles.message}>
            {message}
          </p>
        </section>
      )}
    </div>
  );
}
