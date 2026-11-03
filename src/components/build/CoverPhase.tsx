"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BuildApp.module.css";
import ModelViewer, { ViewerPlaceholder } from "@/components/player/ModelViewer";
import { loadPhaseText, type ModelState } from "@/components/player/useModel";
import { estimateMinutes, isHeavy, type ModelEntry, type SetEntry } from "@/lib/catalog";
import type { Progress } from "@/lib/progress";
import { useT } from "@/i18n/LocaleProvider";
import { themePathFr } from "@/i18n/themes-fr";

type Props = {
  set: SetEntry;
  model: ModelEntry;
  models: ModelEntry[];
  state: ModelState;
  progress: Progress | undefined;
  officialUrl: string;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
};

const modelLabel = (m: ModelEntry, mainLabel: string) => (m.main ? mainLabel : m.name);

/** Couverture : le modèle fini qui tourne, les chiffres du set, et « Commencer » ou « Reprendre ». */
export default function CoverPhase({ set, model, models, state, progress, officialUrl, onStart, onResume, onRestart }: Props) {
  const fr = useT();
  const pathname = usePathname();
  const steps = state.status === "ready" ? state.loaded.plan.steps.length : model.steps;
  const parts = state.status === "ready" ? state.loaded.plan.totalParts : model.parts;
  const resumable = !!progress && !progress.finishedAt && progress.step > 0;
  const minutes = estimateMinutes({ parts, steps });

  return (
    <div className={styles.cover}>
      {state.status === "ready" ? (
        <ModelViewer loaded={state.loaded} mode={{ kind: "all", autoRotate: true }} className={styles.coverStage} />
      ) : (
        <ViewerPlaceholder
          text={state.status === "error" ? fr.player.error : state.status === "loading" ? loadPhaseText(state.phase, fr) : ""}
          error={state.status === "error"}
          className={styles.coverStage}
        />
      )}

      <div className={styles.coverText}>
        <p className="eyebrow">{themePathFr(set.themePath)}</p>
        <h1 className={styles.title}>{set.name}</h1>
        <p className={styles.number}>{set.number}</p>

        <dl className={styles.facts}>
          <div>
            <dt>{fr.build.cover.pieces}</dt>
            <dd>{parts}</dd>
          </div>
          <div>
            <dt>{fr.build.cover.steps}</dt>
            <dd>{steps}</dd>
          </div>
          <div>
            <dt>{fr.build.cover.time}</dt>
            <dd>{fr.build.cover.minutes(minutes)}</dd>
          </div>
          {set.year && (
            <div>
              <dt>{fr.build.cover.year}</dt>
              <dd>{set.year}</dd>
            </div>
          )}
        </dl>

        {models.length > 1 && (
          <div className={styles.models}>
            <p>{fr.build.cover.alternates}</p>
            <ul>
              {models.map((m) => (
                <li key={m.slug}>
                  <Link href={`${pathname}?modele=${encodeURIComponent(m.slug)}`} aria-current={m.slug === model.slug ? "true" : undefined} replace>
                    {modelLabel(m, fr.build.cover.mainModel)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(model.status === "incomplet" || model.missingParts || model.missingPatterns || model.missingStickers) && (
          <p className={styles.warning}>{fr.build.cover.incomplete}</p>
        )}

        <div className={styles.actions}>
          {resumable ? (
            <>
              <button type="button" className="btn btn-primary" onClick={onResume}>
                {fr.build.cover.resume(progress.step + 1)}
              </button>
              <button type="button" className="btn" onClick={onRestart}>
                {fr.build.cover.restart}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onStart} disabled={state.status !== "ready"}>
              {fr.build.cover.start}
            </button>
          )}
          <a className="btn" href={officialUrl} target="_blank" rel="noopener">
            {fr.build.cover.official}
          </a>
        </div>

        <p className={styles.small}>{fr.build.cover.generatedNote}</p>
        {isHeavy(model) && <p className={styles.small}>{fr.set.heavy}</p>}
        <p className={styles.small}>{fr.build.cover.author(model.author)}</p>
      </div>
    </div>
  );
}
