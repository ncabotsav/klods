/**
 * Progression des montages, gardée dans le navigateur (localStorage) : aucune donnée ne quitte l'appareil.
 * Une entrée par set et par modèle. Le temps compté est le temps passé à monter : un écart de plus de
 * BREAK_MS entre deux actions est une pause, et ne compte pas.
 */
export type Progress = {
  number: string;
  model: string;
  /** Nom du set, pour l'encart « Reprendre » sans relire le catalogue. */
  name: string;
  modelName: string;
  steps: number;
  /** Étape en cours (0 = la première). */
  step: number;
  /** Étapes affichées au moins une fois. */
  seen: number[];
  activeMs: number;
  lastAt: number;
  startedAt: number;
  updatedAt: number;
  partsChecked: boolean;
  /** Pièces marquées manquantes (clé numéro#couleur). */
  missing: string[];
  finishedAt: number | null;
  /** Temps du premier montage complet, quand presque toutes les étapes ont été vues. */
  finishedMs: number | null;
  /** Réponse à « Est-ce que ça correspondait à ta boîte ? ». */
  matched: boolean | null;
};

export const BREAK_MS = 3 * 60_000;
const KEY = "klods:progress:v1";
const listeners = new Set<() => void>();

type Store = Record<string, Progress>;

const keyOf = (number: string, model: string) => `${number}/${model}`;

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* stockage plein ou bloqué : la progression reste en mémoire pour cette visite */
  }
  snapshot = null;
  for (const l of listeners) l();
}

let snapshot: Store | null = null;

/** Pour useSyncExternalStore : la même référence tant que rien ne change. */
export function getSnapshot(): Store {
  snapshot ??= read();
  return snapshot;
}

const EMPTY: Store = {};
export const getServerSnapshot = () => EMPTY;

export function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getProgress(number: string, model: string): Progress | undefined {
  return getSnapshot()[keyOf(number, model)];
}

/** Ajoute au temps de montage l'écart depuis la dernière action, s'il ne s'agit pas d'une pause. */
export function addActiveTime(p: Pick<Progress, "activeMs" | "lastAt">, now: number) {
  const gap = now - p.lastAt;
  return { activeMs: p.activeMs + (p.lastAt && gap > 0 && gap < BREAK_MS ? gap : 0), lastAt: now };
}

/** Un montage compte comme « fait » si au moins 90 % des étapes ont été vues. */
export const followedEnough = (seen: number[], steps: number) => steps > 0 && new Set(seen).size >= Math.ceil(steps * 0.9);

export function updateProgress(
  base: Pick<Progress, "number" | "model" | "name" | "modelName" | "steps">,
  change: (p: Progress) => Partial<Progress>,
  now = Date.now(),
): Progress {
  const store = { ...read() };
  const key = keyOf(base.number, base.model);
  const current: Progress = store[key] ?? {
    ...base,
    step: 0,
    seen: [],
    activeMs: 0,
    lastAt: 0,
    startedAt: now,
    updatedAt: now,
    partsChecked: false,
    missing: [],
    finishedAt: null,
    finishedMs: null,
    matched: null,
  };
  const next: Progress = { ...current, ...base, ...change(current), updatedAt: now };
  store[key] = next;
  write(store);
  return next;
}

/** Efface la progression d'un montage ; renvoie ce qui a été effacé, pour pouvoir l'annuler. */
export function removeProgress(number: string, model: string): Progress | undefined {
  const store = { ...read() };
  const key = keyOf(number, model);
  const removed = store[key];
  if (!removed) return undefined;
  delete store[key];
  write(store);
  return removed;
}

/** Remet une progression effacée (bouton « Annuler »). */
export function restoreProgress(p: Progress) {
  const store = { ...read() };
  store[keyOf(p.number, p.model)] = p;
  write(store);
}

/** Montages commencés et pas terminés, du plus récent au plus ancien. */
export function inProgress(store: Store): Progress[] {
  return Object.values(store)
    .filter((p) => !p.finishedAt && (p.step > 0 || p.partsChecked))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
