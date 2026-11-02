"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./StepPlayer.module.css";
import ModelViewer, { ViewerPlaceholder } from "./ModelViewer";
import { stepCallouts, stepText, type Callout } from "./callouts";
import { useModel, type LoadedModel } from "./useModel";
import { fr } from "@/i18n/fr";

export type PlayerStats = {
  loadMs: number;
  steps: number;
  parts: number;
  assemblies: number;
  /** Durée moyenne de dessin d'une image, en millisecondes. */
  frameMs: number;
  /** Directions d'arrivée : objets posés, guidés par un point d'attache, par un volume touché, temps de calcul. */
  insertion: { placed: number; guided: number; touching: number; ms: number };
};

type StepViewProps = {
  loaded: LoadedModel;
  index: number;
  animate: boolean;
  /** Aller à l'étape `i` ; `animate` quand on avance d'une étape. */
  onGo: (i: number, animate: boolean) => void;
  officialUrl?: string;
  onFrame?: (ms: number) => void;
  /** Bouton affiché à la place de « Étape suivante » sur la dernière étape (« Terminer »). */
  finish?: { label: string; onClick: () => void };
  /** Page de travail : flèches de la direction d'arrivée des pièces. */
  arrows?: boolean;
};

/** Une étape de la notice : vue 3D, numéro, pièces, consigne, navigation. */
export function StepView({ loaded, index, animate, onGo, officialUrl, onFrame, finish, arrows }: StepViewProps) {
  const count = loaded.plan.steps.length;
  const step = loaded.plan.steps[index];
  const callouts = useMemo(() => stepCallouts(loaded, index), [loaded, index]);
  const text = useMemo(() => stepText(loaded, index), [loaded, index]);

  // flèches du clavier, hors des champs de saisie ; Entrée sur un bouton garde son propre effet
  const nav = useRef({ index, count, onGo, finish });
  useEffect(() => {
    nav.current = { index, count, onGo, finish };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.target as HTMLElement).closest("input, select, textarea")) return;
      const { index: i, count: n, onGo: go, finish: end } = nav.current;
      if (e.key === "ArrowRight") {
        if (i < n - 1) go(i + 1, true);
        else end?.onClick();
        e.preventDefault();
      } else if (e.key === "ArrowLeft" && i > 0) {
        go(i - 1, false);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (count <= 1) {
    return (
      <div className={styles.player}>
        <ModelViewer loaded={loaded} mode={{ kind: "all" }} onFrame={onFrame} />
        <div className={styles.noSteps}>
          <p>{fr.player.noSteps}</p>
          {officialUrl && (
            <a className="btn" href={officialUrl} target="_blank" rel="noopener">
              {fr.player.officialManual}
            </a>
          )}
        </div>
      </div>
    );
  }

  const last = index >= count - 1;
  return (
    <div className={styles.player}>
      <ModelViewer
        loaded={loaded}
        mode={{ kind: "step", index, animate }}
        onFrame={onFrame}
        arrows={arrows}
        overlay={
          <div className={styles.overlay}>
            <p className={styles.stepNumber} aria-live="polite">
              <span className={styles.big}>{index + 1}</span>
              <span className={styles.total}>
                {" "}
                {fr.player.of} {count}
              </span>
            </p>
            {step?.assembly && (
              <p className={styles.assembly}>
                {fr.player.assembly} {step.assembly}
                {step.repeat > 1 && <span> · {fr.player.buildTimes(step.repeat)}</span>}
              </p>
            )}
            {callouts.length > 0 && <PartsCallout items={callouts} className={styles.calloutOver} />}
          </div>
        }
      />
      {/* sur téléphone, les pièces passent sous la vue 3D pour ne pas la cacher */}
      {callouts.length > 0 && <PartsCallout items={callouts} className={styles.calloutBelow} />}
      <p className={styles.instruction}>{text}</p>
      <div className={styles.controls}>
        <button type="button" className="btn" onClick={() => onGo(index - 1, false)} disabled={index === 0} aria-label={fr.player.previous}>
          ←
        </button>
        <input
          id="step-scrub"
          type="range"
          min={0}
          max={count - 1}
          value={index}
          onChange={(e) => onGo(Number(e.target.value), false)}
          aria-label={fr.player.scrub}
        />
        {last && finish ? (
          <button type="button" className="btn btn-primary" onClick={finish.onClick}>
            {finish.label}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => onGo(index + 1, true)} disabled={last}>
            {fr.player.next} →
          </button>
        )}
      </div>
    </div>
  );
}

export function PartsCallout({ items, className }: { items: Callout[]; className: string }) {
  return (
    <ul className={`${styles.callout} ${className}`} aria-label={fr.player.partsInStep}>
      {items.map((c) => (
        <li key={c.key} title={c.label}>
          {/* eslint-disable-next-line @next/next/no-img-element -- image générée dans le navigateur */}
          {c.url ? <img src={c.url} alt="" width={56} height={56} /> : null}
          <b>{c.count}×</b>
        </li>
      ))}
    </ul>
  );
}

type Props = {
  /** Chemin du modèle packé, relatif à la racine du site (« data/models/4915-1/principal.mpd.gz »). */
  src: string;
  bytes?: number;
  officialUrl?: string;
  onStats?: (stats: PlayerStats) => void;
  arrows?: boolean;
};

/** Lecteur autonome (page /essai) : charge le modèle et joue ses étapes, avec les mesures. */
export default function StepPlayer({ src, bytes = 0, officialUrl, onStats, arrows }: Props) {
  const state = useModel(src, bytes);
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(false);
  const frames = useRef({ total: 0, count: 0 });

  const loaded = state.status === "ready" ? state.loaded : null;
  useEffect(() => {
    if (!loaded || !onStats) return;
    const report = () =>
      onStats({
        loadMs: loaded.loadMs,
        steps: loaded.plan.steps.length,
        parts: loaded.plan.totalParts,
        assemblies: loaded.plan.assemblyLetters.size,
        frameMs: frames.current.count ? frames.current.total / frames.current.count : 0,
        insertion: loaded.plan.insertion,
      });
    report();
    const timer = window.setInterval(report, 1000);
    return () => window.clearInterval(timer);
  }, [loaded, onStats]);

  if (state.status === "error") return <ViewerPlaceholder text={fr.player.error} error />;
  if (state.status === "loading") return <ViewerPlaceholder text={state.phase} />;
  return (
    <StepView
      loaded={state.loaded}
      index={index}
      animate={animate}
      onGo={(i, a) => {
        setIndex(Math.max(0, Math.min(state.loaded.plan.steps.length - 1, i)));
        setAnimate(a);
      }}
      officialUrl={officialUrl}
      arrows={arrows}
      onFrame={(ms) => {
        frames.current.total += ms;
        frames.current.count++;
      }}
    />
  );
}
