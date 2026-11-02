/**
 * Charge un modèle packé avec LDrawLoader. Fonctionne dans le navigateur et dans Node (tests, contrôle).
 */
import { LoadingManager, type Group } from "three";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { readModelText, type ModelText } from "./ldraw-text.ts";

export type LoadedModel = { model: Group; info: ModelText };

export type LoadOptions = {
  /** Normales lissées : plus joli sur les pièces arrondies, plus lent sur les gros modèles. */
  smoothNormals?: boolean;
};

/*
 * Un fichier packé contient tout. Si une référence manque malgré tout, LDrawLoader cherche le fichier
 * sur le réseau : on lui donne une adresse qui échoue tout de suite, plutôt qu'une adresse relative
 * qui bloque le chargement hors navigateur.
 */
const offline = () => {
  const manager = new LoadingManager();
  manager.setURLModifier((url) => `data:text/plain,${encodeURIComponent(`0 introuvable ${url}`)}`);
  return manager;
};

export async function loadModelText(raw: string, { smoothNormals = true }: LoadOptions = {}): Promise<LoadedModel> {
  const info = readModelText(raw);
  const loader = new LDrawLoader(offline());
  loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
  loader.smoothNormals = smoothNormals;
  loader.addDefaultMaterials();
  const model: Group = await new Promise((ok, ko) => loader.parse(info.text, ok, ko));
  return { model, info };
}
