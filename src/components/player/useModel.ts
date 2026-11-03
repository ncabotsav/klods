"use client";

import { useEffect, useState } from "react";
import { fr } from "@/i18n/fr";
import { asset } from "@/lib/site";

/** Tout ce qu'il faut pour afficher un modèle : le modèle chargé, ses étapes, et les modules du moteur. */
export type LoadedModel = {
  model: import("three").Group;
  plan: import("@/engine/steps").StepPlan;
  info: import("@/engine/ldraw-text").ModelText;
  engine: {
    Stage: typeof import("@/engine/stage").Stage;
    instructions: typeof import("@/engine/instructions");
    thumbs: typeof import("@/engine/thumbs");
    steps: typeof import("@/engine/steps");
  };
  /** Clé unique du modèle, pour les miniatures en cache. */
  key: string;
  loadMs: number;
};

export type ModelState = { status: "loading"; phase: string } | { status: "error" } | { status: "ready"; loaded: LoadedModel };

/** Au-delà de 2 Mo de texte, pas de normales lissées : le chargement va bien plus vite. */
const SMOOTH_LIMIT = 2_000_000;
/** Au-delà de 1 Mo, les directions d'arrivée sont calculées dans un Web Worker, en parallèle du chargement. */
const WORKER_LIMIT = 1_000_000;

type InsertionData = import("@/engine/insertion").InsertionData;

/** Lance le calcul des directions d'arrivée dans un Web Worker ; null si le navigateur ne peut pas. */
function insertionsInWorker(text: string): Promise<InsertionData> | null {
  if (typeof Worker === "undefined") return null;
  try {
    const worker = new Worker(new URL("../../engine/insertion.worker.ts", import.meta.url), { type: "module" });
    return new Promise<InsertionData>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent<{ ok: boolean; data?: InsertionData; error?: string }>) => {
        worker.terminate();
        if (e.data.ok && e.data.data) resolve(e.data.data);
        else reject(new Error(e.data.error ?? "worker"));
      };
      worker.onerror = (e) => {
        worker.terminate();
        reject(new Error(e.message || "worker"));
      };
      worker.postMessage({ text });
    });
  } catch {
    return null;
  }
}

/** Charge un modèle packé (« data/models/4915-1/principal.mpd.gz ») et prépare ses étapes, dans le navigateur. */
export function useModel(src: string, bytes = 0): ModelState {
  const [state, setState] = useState<ModelState>({ status: "loading", phase: fr.player.loading });

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    (async () => {
      const [{ bytesToText }, { loadModelText }, steps, { Stage }, instructions, thumbs] = await Promise.all([
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
      setState({ status: "loading", phase: fr.player.loadingSteps });
      // laisse le navigateur afficher le message avant le calcul, qui bloque la page un moment
      await new Promise((r) => setTimeout(r, 30));
      // gros modèle : les directions d'arrivée se calculent à côté, la page ne bloque que pour le chargement
      // les tests de bout en bout baissent le seuil (window.klodsWorkerLimit) pour passer par le Worker
      const limit = (window as { klodsWorkerLimit?: number }).klodsWorkerLimit ?? WORKER_LIMIT;
      const background = bytes > limit ? insertionsInWorker(raw) : null;
      const { model, info } = await loadModelText(raw, { smoothNormals: bytes > 0 && bytes < SMOOTH_LIMIT });
      const plan = steps.buildSteps(model, info, { insertion: !background });
      if (background) {
        const { applyInsertions, assignInsertions } = await import("@/engine/insertion");
        const data = await background.catch((err) => {
          console.warn("directions d'arrivée : calcul sur la page", err);
          return null;
        });
        if (cancelled) return;
        if (data && applyInsertions(plan.steps, data)) plan.insertion = data.stats;
        else plan.insertion = assignInsertions(model, plan.steps, info);
      }
      if (cancelled) return;
      setState({
        status: "ready",
        loaded: { model, plan, info, engine: { Stage, instructions, thumbs, steps }, key: src, loadMs: Math.round(performance.now() - t0) },
      });
    })().catch((err) => {
      console.error(err);
      if (!cancelled) setState({ status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [src, bytes]);

  return state;
}
