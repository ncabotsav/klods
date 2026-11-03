/**
 * Web Worker du parcours de montage : calcule les directions d'arrivée d'un gros modèle hors du fil
 * principal (plusieurs secondes sur les plus gros sets), pendant que la page charge le même modèle.
 * Reçoit le texte du modèle, renvoie `InsertionData` (src/engine/insertion.ts).
 */
import { loadModelText } from "./load.ts";
import { buildSteps } from "./steps.ts";
import { readInsertions } from "./insertion.ts";

type Ask = { text: string };

self.onmessage = async (e: MessageEvent<Ask>) => {
  try {
    const { model, info } = await loadModelText(e.data.text, { smoothNormals: false });
    const plan = buildSteps(model, info);
    self.postMessage({ ok: true, data: readInsertions(plan.steps, plan.insertion) });
  } catch (err) {
    self.postMessage({ ok: false, error: String((err as Error)?.message ?? err) });
  }
};
