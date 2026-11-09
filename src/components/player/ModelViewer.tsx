"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./StepPlayer.module.css";
import type { LoadedModel } from "./useModel";
import { useT } from "@/i18n/LocaleProvider";
import { useWebGL } from "@/lib/webgl";

export type ViewerMode = { kind: "all"; autoRotate?: boolean } | { kind: "step"; index: number; animate: boolean };

type Props = {
  loaded: LoadedModel;
  mode: ViewerMode;
  /** Éléments posés sur la vue (numéro d'étape, encadré des pièces). */
  overlay?: ReactNode;
  onFrame?: (ms: number) => void;
  className?: string;
  /** Page de travail : flèches de la direction d'arrivée des pièces. */
  arrows?: boolean;
  /** Boutons posés sur la vue (recadrer, agrandir) ; non sur l'aperçu de l'accueil, qui tourne tout seul. */
  buttons?: boolean;
  /** Vue agrandie à toute la fenêtre : état et bascule, tenus par le parent (qui agrandit aussi la navigation). */
  expand?: { expanded: boolean; onToggle: () => void };
};

/** Vue 3D d'un modèle chargé : le modèle entier, ou le modèle à une étape donnée. */
export default function ModelViewer({ loaded, mode, overlay, onFrame, className, arrows = false, buttons = true, expand }: Props) {
  const fr = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<InstanceType<LoadedModel["engine"]["Stage"]> | null>(null);
  const webgl = useWebGL();
  const onFrameRef = useRef(onFrame);
  // « Recadrer » n'apparaît qu'après un geste sur la vue : avant, il n'aurait rien à faire
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!containerRef.current || !webgl) return;
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(name).trim();
    const stage = new loaded.engine.Stage(containerRef.current, {
      highlight: token("--hi"),
      arrowColors: { guided: token("--accent"), fallback: token("--muted") },
      onFrame: (ms) => onFrameRef.current?.(ms),
      onUserMove: () => setMoved(true),
    });
    stage.setModel(loaded.model, loaded.plan);
    stageRef.current = stage;
    return () => {
      stage.dispose();
      stageRef.current = null;
    };
  }, [loaded, webgl]);

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
    // une nouvelle étape recadre la vue d'elle-même
    setMoved(false);
  }, [loaded, kind, index, animate, autoRotate]);

  useEffect(() => {
    stageRef.current?.setInsertArrows(arrows);
  }, [loaded, arrows]);

  // sans WebGL : un message à la place de la vue 3D ; consignes, pièces et navigation restent là
  if (!webgl)
    return (
      <div className={`${styles.stage} ${className ?? ""}`}>
        {overlay}
        <ViewerMessage text={fr.player.noWebgl} />
      </div>
    );

  return (
    <div className={`${styles.stage} ${className ?? ""}`} ref={containerRef}>
      {overlay}
      {buttons && (
        <div className={styles.viewButtons}>
          {expand && (
            <button
              type="button"
              className={styles.viewButton}
              onClick={expand.onToggle}
              aria-label={expand.expanded ? fr.player.shrink : fr.player.expand}
              title={expand.expanded ? fr.player.shrink : fr.player.expand}
              aria-pressed={expand.expanded}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {expand.expanded ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
              </svg>
            </button>
          )}
          {moved && (
            <button
              type="button"
              className={styles.viewButton}
              onClick={() => {
                stageRef.current?.reframe();
                setMoved(false);
              }}
              aria-label={fr.player.reframe}
              title={fr.player.reframe}
            >
              {/* flèche qui revient : la vue retrouve sa position de départ */}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12a8 8 0 1 0 2.4-5.7" />
                <path d="M4 4v4.5h4.5" />
              </svg>
            </button>
          )}
        </div>
      )}
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

/** Message posé dans la zone de la vue 3D, sans la remplacer (l'encadré des pièces reste par-dessus). */
function ViewerMessage({ text }: { text: string }) {
  return (
    <p className={styles.status} role="status">
      {text}
    </p>
  );
}
