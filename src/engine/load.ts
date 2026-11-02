/**
 * Charge un modèle packé avec LDrawLoader. Fonctionne dans le navigateur et dans Node (tests, contrôle).
 */
import { LoadingManager, type Group, type Material, type Object3D } from "three";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { readModelText, type ModelText } from "./ldraw-text.ts";

export type LoadedModel = { model: Group; info: ModelText };

export type LoadOptions = {
  /** Normales lissées : plus joli sur les pièces arrondies, plus lent sur les gros modèles. */
  smoothNormals?: boolean;
};

/*
 * Hors navigateur (Node : tests, contrôle du catalogue), FileLoader de three.js utilise ProgressEvent,
 * qui n'existe pas : sans ce remplaçant, une requête plante sans prévenir et le chargement ne finit jamais.
 */
if (typeof globalThis.ProgressEvent === "undefined") {
  (globalThis as { ProgressEvent?: unknown }).ProgressEvent = class extends Event {
    lengthComputable: boolean;
    loaded: number;
    total: number;
    constructor(type: string, init: { lengthComputable?: boolean; loaded?: number; total?: number } = {}) {
      super(type);
      this.lengthComputable = init.lengthComputable ?? false;
      this.loaded = init.loaded ?? 0;
      this.total = init.total ?? 0;
    }
  };
}

/*
 * Un fichier packé contient tout. Si une référence manque malgré tout, LDrawLoader cherche le fichier
 * sur le réseau : on lui répond tout de suite par un
 * fichier vide (une adresse data:), sans rien demander au réseau.
 */
const offline = () => {
  const manager = new LoadingManager();
  manager.setURLModifier((url) => `data:text/plain,${encodeURIComponent(`0 introuvable ${url}`)}`);
  return manager;
};

/** Gris clair à la place du magenta de LDrawLoader pour une couleur inconnue : la pièce reste lisible. */
const MISSING_COLOUR = 0xa0a5a9;
const MISSING_EDGE = 0x333333;

type LoaderInternals = {
  missingColorMaterial: Material & { color: { set(c: number): void } };
  missingEdgeColorMaterial: Material & { color: { set(c: number): void } };
  missingConditionalEdgeColorMaterial: Material & { color: { set(c: number): void } };
  conditionalEdgeMaterialCache: WeakMap<Material, Material>;
};

/**
 * Couleurs inconnues (par exemple le code 361 de quelques fichiers OMR). LDrawLoader crée son matériau
 * « couleur manquante » des lignes conditionnelles après avoir rempli sa table : les lignes de ces pièces
 * reçoivent `null`, et le rendu plante (« reading 'visible' »). On recâble la table, en gris.
 */
function patchMissingColours(loader: LDrawLoader) {
  const l = loader as unknown as LoaderInternals;
  l.missingColorMaterial.color.set(MISSING_COLOUR);
  l.missingEdgeColorMaterial.color.set(MISSING_EDGE);
  l.missingConditionalEdgeColorMaterial.color.set(MISSING_EDGE);
  l.conditionalEdgeMaterialCache.set(l.missingEdgeColorMaterial, l.missingConditionalEdgeColorMaterial);
  return l;
}

/** Filet de sécurité : aucun objet du modèle ne garde un matériau vide. */
function fillEmptyMaterials(model: Object3D, l: LoaderInternals) {
  model.traverse((o) => {
    const obj = o as Object3D & { material?: Material | (Material | null)[] | null; isConditionalLine?: boolean; isLineSegments?: boolean };
    if (!("material" in obj)) return;
    const fallback = obj.isConditionalLine ? l.missingConditionalEdgeColorMaterial : obj.isLineSegments ? l.missingEdgeColorMaterial : l.missingColorMaterial;
    if (Array.isArray(obj.material)) obj.material = obj.material.map((m) => m ?? fallback);
    else if (!obj.material) obj.material = fallback;
  });
}

export async function loadModelText(raw: string, { smoothNormals = true }: LoadOptions = {}): Promise<LoadedModel> {
  const info = readModelText(raw);
  const loader = new LDrawLoader(offline());
  loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
  const internals = patchMissingColours(loader);
  loader.smoothNormals = smoothNormals;
  loader.addDefaultMaterials();
  const model: Group = await new Promise((ok, ko) => loader.parse(info.text, ok, ko));
  fillEmptyMaterials(model, internals);
  return { model, info };
}
