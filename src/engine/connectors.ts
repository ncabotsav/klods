/**
 * Points d'attache des pièces, lus dans leurs primitives LDraw : tenons, tubes, trous et broches
 * Technic, axes, douilles. Chaque primitive est dessinée le long de son axe Y local : une fois placée
 * dans la pièce, elle donne un segment (un point de départ, un axe, une longueur).
 *
 * Le genre (mâle, femelle) ne sert pas : pour savoir par où une pièce arrive, il suffit de savoir
 * que deux points d'attache sont alignés sur le même axe. Fonctionne aussi dans Node (contrôle).
 */
import { normName } from "./ldraw-text.ts";

export type Vec3 = [number, number, number];

/** Un point d'attache : départ, axe (unitaire, sans sens) et longueur le long de l'axe, en LDU. */
export type Connector = { p: Vec3; a: Vec3; len: number };

/** Matrice LDraw d'une ligne de type 1 : translation puis 3 × 3 par lignes. */
type Ref = { file: string; m: number[] };

/**
 * Primitives qui portent une connexion. Les tubes de dessous (stud3, stud4…) sont des « stud* » aussi.
 * Les clips et poignées sont laissés de côté : la barre y entre en travers de leur axe.
 */
const CONNECTOR = /^(stud\d*[a-z0-9]*|filstud\d*|connect\d*[a-z]?|confric\d*|peghole\d*|npeghol\w*|beamhole\w*|connhol\w*|axle|axleend\w*|axlehol\w*|axl\dhol\w*|axl\dho\d+|bush\d*|wpin\w*|towball\w*)\.dat$/;

/** Primitives longues dessinées sur une longueur d'une unité (axe, trou d'axe) : leur échelle Y est leur longueur. */
const UNIT_LENGTH = /^(axle|axlehol\w*|axl\dhol\w*|axl\dho\d+|connhol\w*|beamhole\w*)\.dat$/;

/** Nom d'un fichier tel qu'une ligne de type 1 le cite : « parts/3001.dat » et « p/stud.dat » deviennent « 3001.dat » et « stud.dat ». */
export const refKey = (name: string) => normName(name).replace(/^(parts|p)\//, "");

const RE_FILE = /^\s*0\s+FILE\s+(.+?)\s*$/i;
const RE_REF = /^\s*1\s+\S+\s+((?:\S+\s+){12})(.+?)\s*$/;

/** Découpe le texte packé en fichiers et garde, pour chacun, ses références (ligne de type 1). */
export function parseRefs(text: string): Map<string, Ref[]> {
  const files = new Map<string, Ref[]>();
  let current: Ref[] = [];
  files.set("", current);
  for (const line of text.split(/\r?\n/)) {
    const f = RE_FILE.exec(line);
    if (f) {
      current = [];
      files.set(refKey(f[1]), current);
      continue;
    }
    const r = RE_REF.exec(line);
    if (!r) continue;
    const m = r[1].trim().split(/\s+/).map(Number);
    if (m.length === 12 && m.every(Number.isFinite)) current.push({ file: refKey(r[2]), m });
  }
  return files;
}

/** Applique la matrice LDraw `m` (x y z a b c d e f g h i) à un point. */
const apply = (m: number[], [x, y, z]: Vec3): Vec3 => [
  m[0] + m[3] * x + m[4] * y + m[5] * z,
  m[1] + m[6] * x + m[7] * y + m[8] * z,
  m[2] + m[9] * x + m[10] * y + m[11] * z,
];
/** Applique seulement la partie 3 × 3 (une direction). */
const rotate = (m: number[], [x, y, z]: Vec3): Vec3 => [m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z, m[9] * x + m[10] * y + m[11] * z];
const length = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);

/**
 * Points d'attache de chaque fichier, dans son repère, calculés à la demande et gardés.
 * `connectorsOf("3001.dat")` descend dans ses sous-fichiers jusqu'aux primitives.
 */
export function createConnectorIndex(text: string) {
  const refs = parseRefs(text);
  const memo = new Map<string, Connector[]>();

  function connectorsOf(file: string): Connector[] {
    const key = refKey(file);
    const hit = memo.get(key);
    if (hit) return hit;
    memo.set(key, []); // garde-fou contre une boucle de références
    const out: Connector[] = [];
    for (const r of refs.get(key) ?? []) {
      if (r.file.includes("/") && !r.file.startsWith("s/")) continue; // p/48/… : géométrie fine, pas de connexion
      if (CONNECTOR.test(r.file)) {
        const axis = rotate(r.m, [0, 1, 0]);
        const scale = length(axis);
        if (scale < 1e-6) continue;
        out.push({ p: apply(r.m, [0, 0, 0]), a: [axis[0] / scale, axis[1] / scale, axis[2] / scale], len: UNIT_LENGTH.test(r.file) ? scale : 0 });
        continue;
      }
      for (const c of connectorsOf(r.file)) {
        const axis = rotate(r.m, c.a);
        const scale = length(axis);
        if (scale < 1e-6) continue;
        out.push({ p: apply(r.m, c.p), a: [axis[0] / scale, axis[1] / scale, axis[2] / scale], len: c.len * scale });
      }
    }
    const merged = dedupe(out);
    memo.set(key, merged);
    return merged;
  }

  return { connectorsOf, files: refs };
}

/** Une primitive dessinée en plusieurs morceaux (un trou d'axe, par exemple) ne compte qu'une fois. */
function dedupe(list: Connector[]): Connector[] {
  const out: Connector[] = [];
  for (const c of list) {
    const same = out.find(
      (o) => Math.abs(o.p[0] - c.p[0]) < 0.5 && Math.abs(o.p[1] - c.p[1]) < 0.5 && Math.abs(o.p[2] - c.p[2]) < 0.5 && Math.abs(o.a[0] * c.a[0] + o.a[1] * c.a[1] + o.a[2] * c.a[2]) > 0.99,
    );
    if (same) same.len = Math.max(same.len, c.len);
    else out.push({ ...c });
  }
  return out;
}
