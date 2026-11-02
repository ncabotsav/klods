"use client";

import Link from "next/link";
import styles from "./BuildApp.module.css";
import ModelViewer from "@/components/player/ModelViewer";
import type { ModelState } from "@/components/player/useModel";
import { estimateMinutes, type ModelEntry, type SetEntry } from "@/lib/catalog";
import { formatDuration, type Progress } from "@/lib/progress";
import { GITHUB_URL } from "@/lib/site";
import { fr } from "@/i18n/fr";

type Props = {
  set: SetEntry;
  model: ModelEntry;
  state: ModelState;
  progress: Progress | undefined;
  related: SetEntry[];
  onBack: () => void;
  onRestart: () => void;
  onMatched: (matched: boolean) => void;
};

/** Lien vers une issue GitHub préremplie : pas de serveur avant le sprint 7, les retours passent par là. */
function reportUrl(set: SetEntry, model: ModelEntry) {
  const q = new URLSearchParams({
    title: fr.build.done.reportTitle(set.number, set.name),
    body: fr.build.done.reportBody(set.number, set.name, model.name, model.file),
  });
  return `${GITHUB_URL}/issues/new?${q}`;
}

/** Fin du montage : le modèle fini, le temps passé, « ça correspondait ? », et des sets à monter ensuite. */
export default function DonePhase({ set, model, state, progress, related, onBack, onRestart, onMatched }: Props) {
  const steps = state.status === "ready" ? state.loaded.plan.steps.length : model.steps;
  const parts = state.status === "ready" ? state.loaded.plan.totalParts : model.parts;

  return (
    <div className={styles.done}>
      {state.status === "ready" && <ModelViewer loaded={state.loaded} mode={{ kind: "all", autoRotate: true }} className={styles.coverStage} />}
      <div className={styles.coverText}>
        <h1 className={styles.title}>{fr.build.done.title}</h1>
        <p className={styles.muted}>{fr.build.done.lead}</p>

        <dl className={styles.facts}>
          <div>
            <dt>{fr.build.done.yourTime}</dt>
            <dd>{progress?.finishedMs ? formatDuration(progress.finishedMs) : fr.build.done.notCounted}</dd>
          </div>
          <div>
            <dt>{fr.build.done.estimate}</dt>
            <dd>{fr.build.cover.minutes(estimateMinutes({ parts, steps }))}</dd>
          </div>
        </dl>

        <div className={styles.matched}>
          <p>{fr.build.done.matched}</p>
          {progress?.matched == null ? (
            <div className={styles.actions}>
              <button type="button" className="btn" onClick={() => onMatched(true)}>
                {fr.build.done.yes}
              </button>
              <button type="button" className="btn" onClick={() => onMatched(false)}>
                {fr.build.done.no}
              </button>
            </div>
          ) : progress.matched ? (
            <p className={styles.muted}>{fr.build.done.thanks}</p>
          ) : (
            <>
              <p className={styles.muted}>{fr.build.done.reportLead}</p>
              <a className="btn" href={reportUrl(set, model)} target="_blank" rel="noopener">
                {fr.build.done.report}
              </a>
            </>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className="btn" onClick={onBack}>
            {fr.build.done.back}
          </button>
          <button type="button" className="btn" onClick={onRestart}>
            {fr.build.done.again}
          </button>
        </div>

        {related.length > 0 && (
          <div className={styles.related}>
            <h2 className={styles.subTitle}>{fr.build.done.next}</h2>
            <ul>
              {related.map((r) => (
                <li key={r.number}>
                  <Link href={`/set/${r.number}/monter/`}>
                    <span className={styles.number}>{r.number}</span> {r.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
