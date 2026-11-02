"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Object3D } from "three";
import styles from "./StepPlayer.module.css";
import { fr } from "@/i18n/fr";
import { asset } from "@/lib/site";

type LoadedPlayer = {
  stage: import("@/engine/stage").Stage;
  plan: import("@/engine/steps").StepPlan;
  info: import("@/engine/ldraw-text").ModelText;
  instructions: typeof import("@/engine/instructions");
  thumbs: typeof import("@/engine/thumbs");
};

export type PlayerStats = {
  loadMs: number;
  steps: number;
  parts: number;
  assemblies: number;
  /** Durée moyenne de dessin d'une image, en millisecondes. */
  frameMs: number;
};

type Callout = { key: string; url: string; count: number; label: string };

type Props = {
  /** Chemin du modèle packé, relatif à la racine du site (« data/models/4915-1/principal.mpd.gz »). */
  src: string;
  /** Taille du fichier non compressé : au-delà de 2 Mo, pas de normales lissées (chargement plus rapide). */
  bytes?: number;
  officialUrl?: string;
  onStats?: (stats: PlayerStats) => void;
};

const SMOOTH_LIMIT = 2_000_000;

export default function StepPlayer({ src, bytes = 0, officialUrl, onStats }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<LoadedPlayer | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [phase, setPhase] = useState<string>(fr.player.loading);
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [assembly, setAssembly] = useState<{ letter: string; repeat: number } | null>(null);
  const onStatsRef = useRef(onStats);
  useEffect(() => {
    onStatsRef.current = onStats;
  }, [onStats]);

  // chargement du modèle et création de la scène (le parent change la `key` du lecteur pour un autre modèle)
  useEffect(() => {
    let cancelled = false;
    let frameTotal = 0;
    let frames = 0;
    let cleanupTimer = () => {};
    const t0 = performance.now();

    (async () => {
      const [{ bytesToText }, { loadModelText }, { buildSteps }, { Stage }, instructions, thumbs] = await Promise.all([
        import("@/engine/ldraw-text"),
        import("@/engine/load"),
        import("@/engine/steps"),
        import("@/engine/stage"),
        import("@/engine/instructions"),
        import("@/engine/thumbs"),
      ]);
      const res = await fetch(asset(`/${src}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await bytesToText(await res.arrayBuffer());
      if (cancelled) return;
      setPhase(fr.player.loadingSteps);
      const { model, info } = await loadModelText(raw, { smoothNormals: bytes > 0 && bytes < SMOOTH_LIMIT });
      const plan = buildSteps(model, info);
      if (cancelled || !stageRef.current) return;

      const highlight = getComputedStyle(document.documentElement).getPropertyValue("--hi").trim();
      const stage = new Stage(stageRef.current, {
        highlight,
        onFrame: (ms) => {
          frameTotal += ms;
          frames++;
        },
      });
      stage.setModel(model, plan);
      playerRef.current = { stage, plan, info, instructions, thumbs };
      setCount(plan.steps.length);
      setStatus("ready");
      const loadMs = Math.round(performance.now() - t0);
      const report = () =>
        onStatsRef.current?.({
          loadMs,
          steps: plan.steps.length,
          parts: plan.totalParts,
          assemblies: plan.assemblyLetters.size,
          frameMs: frames ? frameTotal / frames : 0,
        });
      report();
      const timer = window.setInterval(report, 1000);
      cleanupTimer = () => window.clearInterval(timer);
    })().catch((err) => {
      if (cancelled) return;
      console.error(err);
      setStatus("error");
    });

    return () => {
      cancelled = true;
      cleanupTimer();
      playerRef.current?.stage.dispose();
      playerRef.current = null;
    };
  }, [src, bytes]);

  // affichage d'une étape
  const show = useCallback((i: number, animate: boolean) => {
    const p = playerRef.current;
    if (!p || !p.plan.steps.length) return;
    const k = Math.max(0, Math.min(p.plan.steps.length - 1, i));
    const step = p.plan.steps[k];
    p.stage.showStep(k, animate);
    setIndex(k);

    const letterOf = (a: Object3D) => p.plan.assemblyLetters.get(String(a.userData.fileName).toLowerCase());
    setText(p.instructions.stepInstruction(step, p.info, letterOf));
    setAssembly(step.assembly ? { letter: step.assembly, repeat: step.repeat } : null);
    const groups = p.instructions.groupParts(step.parts, p.info);
    const list: Callout[] = groups.map((g) => ({
      key: g.key,
      url: p.thumbs.partThumbnail(`${src}|${g.key}`, g.sample),
      count: g.count,
      label: p.instructions.describeGroup(g),
    }));
    for (const a of step.assemblies) {
      const letter = letterOf(a) ?? "?";
      const existing = list.find((c) => c.key === `assembly:${letter}`);
      if (existing) existing.count++;
      else list.push({ key: `assembly:${letter}`, url: p.thumbs.partThumbnail(`${src}|assembly:${letter}`, a), count: 1, label: `${fr.player.assembly} ${letter}` });
    }
    setCallouts(list);
  }, [src]);

  useEffect(() => {
    if (status === "ready") show(0, false);
  }, [status, show]);

  // flèches du clavier, hors des champs de saisie
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (status !== "ready" || (e.target as HTMLElement).closest("input, select, textarea")) return;
      if (e.key === "ArrowRight") {
        show(index + 1, true);
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        show(index - 1, false);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, index, show]);

  const singleStep = status === "ready" && count <= 1;

  return (
    <div className={styles.player}>
      <div className={styles.stage} ref={stageRef}>
        {status === "ready" && (
          <div className={styles.overlay}>
            <p className={styles.stepNumber} aria-live="polite">
              <span className={styles.big}>{index + 1}</span>
              <span className={styles.total}>
                {" "}
                {fr.player.of} {count}
              </span>
            </p>
            {assembly && (
              <p className={styles.assembly}>
                {fr.player.assembly} {assembly.letter}
                {assembly.repeat > 1 && <span> · {fr.player.buildTimes(assembly.repeat)}</span>}
              </p>
            )}
            {callouts.length > 0 && (
              <ul className={styles.callout} aria-label={fr.player.partsInStep}>
                {callouts.map((c) => (
                  <li key={c.key} title={c.label}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- image générée dans le navigateur */}
                    <img src={c.url} alt="" width={56} height={56} />
                    <b>{c.count}×</b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {status === "ready" && (
          <button type="button" className={styles.reframe} onClick={() => playerRef.current?.stage.reframe()} aria-label={fr.player.reframe} title={fr.player.reframe}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        )}
        {status === "ready" && <p className={styles.hint}>{fr.player.hint}</p>}
        {status !== "ready" && (
          <p className={styles.status} role={status === "error" ? "alert" : "status"}>
            {status === "error" ? fr.player.error : phase}
          </p>
        )}
      </div>

      {singleStep && (
        <div className={styles.noSteps}>
          <p>{fr.player.noSteps}</p>
          {officialUrl && (
            <a className="btn" href={officialUrl} target="_blank" rel="noopener">
              {fr.player.officialManual}
            </a>
          )}
        </div>
      )}

      {status === "ready" && !singleStep && (
        <>
          <p className={styles.instruction}>{text}</p>
          <div className={styles.controls}>
            <button type="button" className="btn" onClick={() => show(index - 1, false)} disabled={index === 0} aria-label={fr.player.previous}>
              ←
            </button>
            <input
              id="step-scrub"
              type="range"
              min={0}
              max={Math.max(0, count - 1)}
              value={index}
              onChange={(e) => show(Number(e.target.value), false)}
              aria-label={fr.player.scrub}
            />
            <button type="button" className="btn btn-primary" onClick={() => show(index + 1, true)} disabled={index >= count - 1}>
              {fr.player.next} →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
