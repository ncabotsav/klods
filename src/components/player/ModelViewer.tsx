"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./StepPlayer.module.css";
import type { LoadedModel } from "./useModel";
import { fr } from "@/i18n/fr";

export type ViewerMode = { kind: "all"; autoRotate?: boolean } | { kind: "step"; index: number; animate: boolean };

type Props = {
  loaded: LoadedModel;
  mode: ViewerMode;
  /** Éléments posés sur la vue (numéro d'étape, encadré des pièces). */
  overlay?: ReactNode;
  onFrame?: (ms: number) => void;
  className?: string;
};

/** Vue 3D d'un modèle chargé : le modèle entier, ou le modèle à une étape donnée. */
export default function ModelViewer({ loaded, mode, overlay, onFrame, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<InstanceType<LoadedModel["engine"]["Stage"]> | null>(null);
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!containerRef.current) return;
    const highlight = getComputedStyle(document.documentElement).getPropertyValue("--hi").trim();
    const stage = new loaded.engine.Stage(containerRef.current, { highlight, onFrame: (ms) => onFrameRef.current?.(ms) });
    stage.setModel(loaded.model, loaded.plan);
    stageRef.current = stage;
    return () => {
      stage.dispose();
      stageRef.current = null;
    };
  }, [loaded]);

  const kind = mode.kind;
  const index = mode.kind === "step" ? mode.index : -1;
  const animate = mode.kind === "step" ? mode.animate : false;
  const autoRotate = mode.kind === "all" ? !!mode.autoRotate : false;
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (kind === "all") stage.showAll();
    else stage.showStep(index, animate);
    stage.setAutoRotate(autoRotate);
  }, [loaded, kind, index, animate, autoRotate]);

  return (
    <div className={`${styles.stage} ${className ?? ""}`} ref={containerRef}>
      {overlay}
      <button
        type="button"
        className={styles.reframe}
        onClick={() => stageRef.current?.reframe()}
        aria-label={fr.player.reframe}
        title={fr.player.reframe}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
      <p className={styles.hint}>{fr.player.hint}</p>
    </div>
  );
}

/** Zone 3D vide pendant le chargement ou en cas d'erreur. */
export function ViewerPlaceholder({ text, error = false, className }: { text: string; error?: boolean; className?: string }) {
  return (
    <div className={`${styles.stage} ${className ?? ""}`}>
      <p className={styles.status} role={error ? "alert" : "status"}>
        {text}
      </p>
    </div>
  );
}
