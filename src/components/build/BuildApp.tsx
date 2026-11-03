"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./BuildApp.module.css";
import CoverPhase from "./CoverPhase";
import PartsPhase from "./PartsPhase";
import DonePhase from "./DonePhase";
import StepsSheet from "./StepsSheet";
import { StepView } from "@/components/player/StepPlayer";
import { ViewerPlaceholder } from "@/components/player/ModelViewer";
import { useModel } from "@/components/player/useModel";
import { defaultModel, officialManualUrl, playableModels, type SetEntry } from "@/lib/catalog";
import { addActiveTime, followedEnough, getServerSnapshot, getSnapshot, subscribe, updateProgress } from "@/lib/progress";
import { fr } from "@/i18n/fr";
import { feedbackHref } from "@/lib/feedback";

export type Phase = "cover" | "parts" | "build" | "done";

type Props = { set: SetEntry; related: SetEntry[]; hasCover?: boolean };

/** Lit l'adresse : « ?etape=12 » ouvre le montage à l'étape 12, « ?vue=pieces » ou « ?vue=fin » les autres phases. */
function phaseFromUrl(params: URLSearchParams): { phase: Phase; index: number } {
  const etape = Number(params.get("etape"));
  if (Number.isInteger(etape) && etape > 0) return { phase: "build", index: etape - 1 };
  const vue = params.get("vue");
  if (vue === "pieces") return { phase: "parts", index: 0 };
  if (vue === "fin") return { phase: "done", index: 0 };
  return { phase: "cover", index: 0 };
}

export default function BuildApp({ set, related, hasCover = false }: Props) {
  const params = useSearchParams();
  const models = playableModels(set);
  const model = models.find((m) => m.slug === params.get("modele")) ?? defaultModel(set);
  const state = useModel(model.file, model.bytes);
  const loaded = state.status === "ready" ? state.loaded : null;
  const steps = loaded?.plan.steps.length ?? model.steps;

  const initial = phaseFromUrl(new URLSearchParams(params.toString()));
  const [phase, setPhase] = useState<Phase>(initial.phase);
  const [index, setIndex] = useState(initial.index);
  const [animate, setAnimate] = useState(false);
  const [sheet, setSheet] = useState(false);

  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const progress = store[`${set.number}/${model.slug}`];
  const base = { number: set.number, model: model.slug, name: set.name, modelName: model.name, steps };
  const baseRef = useRef(base);
  useEffect(() => {
    baseRef.current = base;
  });

  /** Écrit l'adresse de la phase et de l'étape ; `push` crée une entrée d'historique (le geste retour y revient). */
  const setUrl = useCallback(
    (next: { phase: Phase; index?: number }, push: boolean) => {
      const q = new URLSearchParams();
      if (models.length > 1 || params.get("modele")) q.set("modele", model.slug);
      if (next.phase === "build") q.set("etape", String((next.index ?? 0) + 1));
      if (next.phase === "parts") q.set("vue", "pieces");
      if (next.phase === "done") q.set("vue", "fin");
      const url = `${window.location.pathname}${q.size ? `?${q}` : ""}`;
      if (push) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [models.length, params, model.slug],
  );

  // ouvert directement sur une étape (« ?etape=12 », lien ou rechargement) : cette étape devient l'étape à reprendre
  const initialRef = useRef(initial);
  useEffect(() => {
    const first = initialRef.current;
    if (first.phase !== "build") return;
    updateProgress(baseRef.current, (p) => ({
      step: first.index,
      seen: p.seen.includes(first.index) ? p.seen : [...p.seen, first.index],
      lastAt: Date.now(),
    }));
  }, []);

  // le geste retour du téléphone recule d'une étape (ou revient à la phase précédente)
  useEffect(() => {
    const onPop = () => {
      const next = phaseFromUrl(new URLSearchParams(window.location.search));
      setPhase(next.phase);
      setIndex(next.index);
      setAnimate(false);
      // l'étape où l'on revient devient l'étape à reprendre
      if (next.phase === "build") updateProgress(baseRef.current, () => ({ step: next.index }));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // l'écran reste allumé pendant le montage, si le navigateur le permet
  useEffect(() => {
    if (phase !== "build" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState === "visible") navigator.wakeLock.request("screen").then((l) => (lock = l), () => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, [phase]);

  const go = useCallback(
    (i: number, anim: boolean) => {
      const k = Math.max(0, Math.min(steps - 1, i));
      setIndex(k);
      setAnimate(anim);
      setPhase("build");
      // avancer d'une étape crée une entrée d'historique ; le curseur et le retour la remplacent
      setUrl({ phase: "build", index: k }, anim);
      updateProgress(baseRef.current, (p) => ({
        step: k,
        seen: p.seen.includes(k) ? p.seen : [...p.seen, k],
        ...addActiveTime(p, Date.now()),
      }));
    },
    [steps, setUrl],
  );

  const startBuilding = useCallback(
    (from: number) => {
      setPhase("build");
      setIndex(from);
      setAnimate(false);
      setUrl({ phase: "build", index: from }, true);
      updateProgress(baseRef.current, (p) => ({
        step: from,
        seen: p.seen.includes(from) ? p.seen : [...p.seen, from],
        lastAt: Date.now(),
      }));
    },
    [setUrl],
  );

  const showPhase = useCallback(
    (next: Phase) => {
      if (next === "build") return startBuilding(progress?.step ?? 0);
      setPhase(next);
      setUrl({ phase: next }, true);
    },
    [progress?.step, setUrl, startBuilding],
  );

  const finish = useCallback(() => {
    const now = Date.now();
    updateProgress(baseRef.current, (p) => {
      const t = addActiveTime(p, now);
      return {
        ...t,
        finishedAt: p.finishedAt ?? now,
        finishedMs: p.finishedMs ?? (followedEnough(p.seen, baseRef.current.steps) ? t.activeMs : null),
      };
    });
    setPhase("done");
    setUrl({ phase: "done" }, true);
  }, [setUrl]);

  const restart = useCallback(() => {
    updateProgress(baseRef.current, () => ({ step: 0, seen: [], activeMs: 0, lastAt: 0, startedAt: Date.now(), finishedAt: null, finishedMs: null }));
    startBuilding(0);
  }, [startBuilding]);

  const official = officialManualUrl(set.number);
  const phases: Phase[] = ["cover", "parts", "build", "done"];

  return (
    <div className={`wrap ${styles.app}`}>
      <div className={styles.head}>
        <p className="eyebrow">
          {set.number} · {set.name}
        </p>
        <nav aria-label={fr.build.phasesLabel}>
          <ol className={styles.phases}>
            {phases.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  className={styles.phase}
                  aria-current={phase === p ? "step" : undefined}
                  disabled={p === "done" && !progress?.finishedAt}
                  onClick={() => showPhase(p)}
                >
                  {fr.build.phases[p]}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {phase === "cover" && (
        <CoverPhase
          set={set}
          model={model}
          models={models}
          state={state}
          progress={progress}
          officialUrl={official}
          onStart={() => (progress?.partsChecked ? startBuilding(0) : showPhase("parts"))}
          onResume={() => startBuilding(progress?.step ?? 0)}
          onRestart={restart}
        />
      )}

      {phase === "parts" &&
        (loaded ? (
          <PartsPhase
            loaded={loaded}
            missing={progress?.missing ?? []}
            onToggleMissing={(key) =>
              updateProgress(baseRef.current, (p) => ({ missing: p.missing.includes(key) ? p.missing.filter((k) => k !== key) : [...p.missing, key] }))
            }
            onDone={() => {
              updateProgress(baseRef.current, () => ({ partsChecked: true }));
              startBuilding(progress?.step ?? 0);
            }}
          />
        ) : (
          <ViewerPlaceholder text={state.status === "error" ? fr.player.error : fr.build.loadingSet} error={state.status === "error"} />
        ))}

      {phase === "build" &&
        (loaded ? (
          <div className={styles.build}>
            <StepView
              loaded={loaded}
              index={Math.min(index, steps - 1)}
              animate={animate}
              onGo={go}
              officialUrl={official}
              finish={{ label: fr.build.steps.finish, onClick: finish }}
            />
            <div className={styles.tools}>
              <button type="button" className="btn" onClick={() => setSheet(true)}>
                {fr.build.steps.all}
              </button>
              <a className="btn" href={`../imprimer/?modele=${encodeURIComponent(model.slug)}`}>
                {fr.build.steps.print}
              </a>
              <Link className="btn" href={feedbackHref({ kind: "etape", set: set.number, model: model.slug, step: Math.min(index, steps - 1) + 1 })}>
                {fr.build.steps.report}
              </Link>
            </div>
            {sheet && (
              <StepsSheet
                loaded={loaded}
                current={index}
                onPick={(i) => {
                  setSheet(false);
                  go(i, false);
                }}
                onClose={() => setSheet(false)}
              />
            )}
          </div>
        ) : (
          <ViewerPlaceholder text={state.status === "error" ? fr.player.error : state.status === "loading" ? state.phase : ""} error={state.status === "error"} />
        ))}

      {phase === "done" && (
        <DonePhase
          set={set}
          model={model}
          state={state}
          progress={progress}
          related={related}
          hasCover={hasCover && model.main}
          onBack={() => startBuilding(steps - 1)}
          onRestart={restart}
          onMatched={(matched) => updateProgress(baseRef.current, () => ({ matched }))}
        />
      )}
    </div>
  );
}
