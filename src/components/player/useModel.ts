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
      const { model, info } = await loadModelText(raw, { smoothNormals: bytes > 0 && bytes < SMOOTH_LIMIT });
      const plan = steps.buildSteps(model, info);
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
