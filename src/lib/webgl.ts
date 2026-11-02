import { useSyncExternalStore } from "react";

/**
 * Le navigateur sait-il dessiner en 3D (WebGL) ? Sans WebGL (vieux navigateur, option coupée,
 * machine sans pilote graphique), le montage reste utilisable avec les consignes et les pièces.
 */
let cached: boolean | null = null;
export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    cached = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    cached = false;
  }
  return cached;
}

const noop = () => () => {};
/** Côté serveur, on suppose que oui : la page construite au build affiche la vue 3D. */
export const useWebGL = () => useSyncExternalStore(noop, hasWebGL, () => true);
