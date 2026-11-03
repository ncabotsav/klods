"use client";

import Link from "next/link";
import styles from "./BuildApp.module.css";
import ModelViewer from "@/components/player/ModelViewer";
import ShareButton from "@/components/ShareButton";
import type { ModelState } from "@/components/player/useModel";
import { estimateMinutes, type ModelEntry, type SetEntry } from "@/lib/catalog";
import { formatDuration, type Progress } from "@/lib/progress";
import { buildPageHref } from "@/lib/site";
import { feedbackHref } from "@/lib/feedback";
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
  /** La couverture dessinée du set existe (modèle principal) : elle illustre la carte de partage. */
  hasCover: boolean;
};

/** Fin du montage : le modèle fini, le temps passé, « ça correspondait ? », et des sets à monter ensuite. */
export default function DonePhase({ set, model, state, progress, related, onBack, onRestart, onMatched, hasCover }: Props) {
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

        <div className={styles.share}>
          <ShareButton
            info={{ number: set.number, name: model.main ? set.name : `${set.name} · ${model.name}`, hasCover, finishedMs: progress?.finishedMs ?? null, formattedTime: progress?.finishedMs ? formatDuration(progress.finishedMs) : null }}
            className="btn btn-primary"
          />
        </div>

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
              <Link className="btn" href={feedbackHref({ kind: "piece", set: set.number, model: model.slug })}>
                {fr.build.done.report}
              </Link>
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
                  <a href={buildPageHref(`/set/${r.number}/monter/`)}>
                    <span className={styles.number}>{r.number}</span> {r.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
