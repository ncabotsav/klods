/**
 * Direction d'arrivée de chaque pièce : par où elle vient se poser à son étape.
 *
 * Pour chaque pièce (ou sous-ensemble) posée, on cherche les contacts avec les pièces déjà en place
 * dans le même contexte, de trois façons :
 *   1. deux points d'attache alignés sur le même axe et presque superposés (tenon dans un tube,
 *      broche dans un trou, axe dans un trou d'axe) ;
 *   2. un point d'attache d'une pièce en place qui entre dans le volume de la nouvelle pièce
 *      (les tenons sous une plaque lisse, qui n'a pas de primitive dessous) ;
 *   3. un point d'attache de la nouvelle pièce qui entre dans le volume d'une pièce en place
 *      (les tenons d'une plaque fixée sous une brique).
 * L'axe qui recueille le plus de contacts est celui de l'emboîtement ; la pièce arrive du côté où elle
 * se trouve par rapport aux pièces qu'elle touche. Sans point d'attache (clip, charnière, pièce de figurine),
 * elle s'écarte des pièces dont elle touche le volume, le long de l'axe le plus proche ; sans rien toucher,
 * elle arrive par son propre haut.
 *
 * Résultat dans userData : `klodsInsert` (direction d'arrivée, unitaire, dans le repère du parent de
 * l'objet : on l'ajoute telle quelle à sa position) et `klodsGuided` (trouvée par un contact).
 * Fonctionne aussi dans Node (contrôle du catalogue).
 */
import { Box3, Matrix4, Vector3, type Mesh, type Object3D } from "three";
import { createConnectorIndex, type Connector, type Vec3 } from "./connectors.ts";
import type { ModelText } from "./ldraw-text.ts";

/** Écart maximal entre deux axes d'attache (un tube est entre quatre tenons : 10√2 ≈ 14 LDU). */
const LATERAL = 15;
/** Distance maximale le long de l'axe entre deux points d'attache (hauteur d'une brique et de son tenon). */
const AXIAL = 32;
/** Deux axes sont parallèles au-delà de ce cosinus. */
const PARALLEL = 0.97;
/** Marge autour du volume d'une pièce : un tenon posé sur sa face compte comme entré. */
const MARGIN = 1.5;
/** Cellules de la grille des pièces, en LDU. */
const CELL = 80;
/** Le haut en LDraw : -Y. */
const UP: Vec3 = [0, -1, 0];

type Step = { context: Object3D; parts: Object3D[]; assemblies: Object3D[] };
/** Une pièce posée : ses points d'attache (repère du modèle), son volume (repère de la pièce), son centre. */
type Placed = { part: Object3D; conns: Connector[]; box: Box3; toLocal: Matrix4; center: Vec3; aabb: Box3; reach: Box3 };

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const v3 = (v: Vector3): Vec3 => [v.x, v.y, v.z];
const isPart = (o: Object3D) => /\.dat$/i.test(String(o.userData?.fileName ?? "")) && !!(o as { isGroup?: boolean }).isGroup;

/** Axe sans sens, ramené à une forme unique (première composante non nulle positive) pour le vote. */
function canonical(a: Vec3): Vec3 {
  const i = Math.abs(a[0]) > 1e-3 ? 0 : Math.abs(a[1]) > 1e-3 ? 1 : 2;
  return a[i] < 0 ? [-a[0], -a[1], -a[2]] : [a[0], a[1], a[2]];
}

/** Deux points d'attache alignés et presque superposés le long de leur axe commun. */
export function aligned(c: Connector, d: Connector): boolean {
  if (Math.abs(dot(c.a, d.a)) < PARALLEL) return false;
  const v = sub(d.p, c.p);
  const t = dot(v, c.a);
  const lateral = Math.hypot(v[0] - c.a[0] * t, v[1] - c.a[1] * t, v[2] - c.a[2] * t);
  if (lateral > LATERAL) return false;
  // segments [0, c.len] et [t, t ± d.len] sur l'axe de c
  const dEnd = t + d.len * Math.sign(dot(c.a, d.a));
  const lo = Math.min(t, dEnd);
  const hi = Math.max(t, dEnd);
  return Math.max(0, lo - c.len, -hi) <= AXIAL;
}

/** Volume d'une pièce dans son propre repère, d'après la géométrie de ses maillages. */
function localBox(part: Object3D): Box3 {
  const box = new Box3();
  const toPart = new Matrix4().copy(part.matrixWorld).invert();
  part.traverse((o) => {
    const geometry = (o as Mesh).geometry;
    if (!geometry || !(o as Mesh).isMesh) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const m = new Matrix4().multiplyMatrices(toPart, o.matrixWorld);
    box.union(geometry.boundingBox!.clone().applyMatrix4(m));
  });
  return box;
}

/** Grille des pièces posées d'un contexte, par cellule de leur boîte englobante. */
class PartGrid {
  private cells = new Map<string, Placed[]>();
  /** Les très grandes pièces (plaques de base) ne vont pas dans la grille : on les teste toujours. */
  private big: Placed[] = [];

  private keys(b: Box3): string[] | null {
    const lo = b.min.clone().divideScalar(CELL).floor();
    const hi = b.max.clone().divideScalar(CELL).floor();
    if ((hi.x - lo.x + 1) * (hi.y - lo.y + 1) * (hi.z - lo.z + 1) > 64) return null;
    const out: string[] = [];
    for (let x = lo.x; x <= hi.x; x++) for (let y = lo.y; y <= hi.y; y++) for (let z = lo.z; z <= hi.z; z++) out.push(`${x},${y},${z}`);
    return out;
  }

  add(p: Placed) {
    const keys = this.keys(p.aabb);
    if (!keys) return void this.big.push(p);
    for (const k of keys) {
      const list = this.cells.get(k);
      if (list) list.push(p);
      else this.cells.set(k, [p]);
    }
  }

  near(b: Box3): Set<Placed> {
    const out = new Set<Placed>(this.big);
    const grown = b.clone().expandByScalar(AXIAL);
    for (const k of this.keys(grown) ?? []) for (const p of this.cells.get(k) ?? []) out.add(p);
    if (!this.keys(grown)) for (const list of this.cells.values()) for (const p of list) if (p.aabb.intersectsBox(grown)) out.add(p);
    return out;
  }
}

/** placed : objets posés ; guided : direction donnée par un point d'attache ; touching : par les volumes touchés. */
export type InsertionStats = { placed: number; guided: number; touching: number; ms: number };

/** Axe du repère `rot` (± X, Y, Z) le plus proche de la direction `d`. */
function snap(d: Vector3, rot: Matrix4): Vec3 {
  let best = new Vector3(0, -1, 0);
  let score = -Infinity;
  for (const axis of [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]) {
    for (const sign of [1, -1]) {
      const v = axis.clone().multiplyScalar(sign).applyMatrix4(rot).normalize();
      const s = v.dot(d);
      if (s > score) {
        score = s;
        best = v;
      }
    }
  }
  return v3(best);
}

export function assignInsertions(model: Object3D, steps: Step[], info: ModelText): InsertionStats {
  const t0 = performance.now();
  const index = createConnectorIndex(info.text);
  model.updateMatrixWorld(true);
  const toModel = new Matrix4().copy(model.matrixWorld).invert();
  const modelMatrix = (o: Object3D) => new Matrix4().multiplyMatrices(toModel, o.matrixWorld);

  const cache = new Map<Object3D, Placed>();
  // le volume d'une pièce dans son repère est le même pour toutes ses copies : un calcul par fichier
  const boxes = new Map<string, Box3>();
  const boxOf = (part: Object3D) => {
    const file = String(part.userData.fileName);
    let box = boxes.get(file);
    if (!box) boxes.set(file, (box = localBox(part)));
    return box;
  };
  const placedOf = (part: Object3D): Placed => {
    let hit = cache.get(part);
    if (hit) return hit;
    const m = modelMatrix(part);
    const rot = new Matrix4().extractRotation(m);
    const conns = index.connectorsOf(String(part.userData.fileName)).map((c) => {
      const a = new Vector3(...c.a).applyMatrix4(rot);
      const scale = a.length() || 1;
      return { p: v3(new Vector3(...c.p).applyMatrix4(m)), a: v3(a.divideScalar(scale)), len: c.len * scale };
    });
    const box = boxOf(part);
    const aabb = box.isEmpty() ? new Box3().setFromCenterAndSize(new Vector3().setFromMatrixPosition(m), new Vector3(1, 1, 1)) : box.clone().applyMatrix4(m);
    hit = {
      part,
      conns,
      box: box.isEmpty() ? box : box.clone().expandByScalar(MARGIN),
      toLocal: m.clone().invert(),
      center: v3(aabb.getCenter(new Vector3())),
      aabb,
      reach: aabb.clone().expandByScalar(AXIAL),
    };
    cache.set(part, hit);
    return hit;
  };
  const tmp = new Vector3();
  const inside = (p: Placed, point: Vec3) => !p.box.isEmpty() && p.box.containsPoint(tmp.set(point[0], point[1], point[2]).applyMatrix4(p.toLocal));
  const partsOf = (o: Object3D): Object3D[] => {
    if (isPart(o)) return [o];
    const out: Object3D[] = [];
    o.traverse((c) => {
      if (c !== o && isPart(c)) out.push(c);
    });
    return out;
  };

  const grids = new Map<Object3D, PartGrid>();
  let placed = 0;
  let guided = 0;
  let touching = 0;

  for (const step of steps) {
    let grid = grids.get(step.context);
    if (!grid) grids.set(step.context, (grid = new PartGrid()));

    for (const item of [...step.parts, ...step.assemblies]) {
      placed++;
      const mine = partsOf(item).map(placedOf);
      const mineSet = new Set(mine.map((p) => p.part));
      const aabb = new Box3();
      for (const p of mine) aabb.union(p.aabb);

      // vote : pour chaque axe, un poids et les pièces touchées
      const votes = new Map<string, { a: Vec3; n: number; owners: Set<Placed> }>();
      const vote = (axis: Vec3, owner: Placed, weight: number) => {
        const a = canonical(axis);
        const k = a.map((x) => x.toFixed(1)).join(",");
        const v = votes.get(k) ?? { a, n: 0, owners: new Set<Placed>() };
        v.n += weight;
        v.owners.add(owner);
        votes.set(k, v);
      };
      for (const other of grid.near(aabb)) {
        if (mineSet.has(other.part)) continue;
        for (const p of mine) {
          if (!p.reach.intersectsBox(other.aabb)) continue;
          for (const c of p.conns) {
            for (const d of other.conns) if (aligned(c, d)) vote(c.a, other, 2);
            if (inside(other, c.p)) vote(c.a, other, 1);
          }
          for (const d of other.conns) if (inside(p, d.p)) vote(d.a, other, 1);
        }
      }
      const best = [...votes.values()].sort((x, y) => y.n - x.n)[0];
      // sans point d'attache : les pièces en place dont la nouvelle touche le volume
      const touched = best ? [] : [...grid.near(aabb)].filter((o) => !mineSet.has(o.part) && o.aabb.intersectsBox(aabb.clone().expandByScalar(MARGIN)));

      let dir: Vec3;
      if (best) {
        guided++;
        // du côté où se trouve la pièce par rapport à celles qu'elle touche ; à égalité, par le haut
        const here = v3(aabb.getCenter(new Vector3()));
        const there: Vec3 = [0, 0, 0];
        for (const o of best.owners) for (let i = 0; i < 3; i++) there[i] += o.center[i] / best.owners.size;
        let s = dot(best.a, sub(here, there));
        if (Math.abs(s) < 2) s = dot(best.a, UP) || 1;
        dir = s < 0 ? [-best.a[0], -best.a[1], -best.a[2]] : best.a;
      } else if (touched.length) {
        touching++;
        const here = aabb.getCenter(new Vector3());
        const there = new Vector3();
        for (const o of touched) there.add(new Vector3(...o.center).divideScalar(touched.length));
        const away = here.sub(there);
        const frame = new Matrix4().extractRotation(isPart(item) ? modelMatrix(item) : item.parent ? modelMatrix(item.parent) : new Matrix4());
        dir = away.lengthSq() < 1 ? v3(new Vector3(...UP).applyMatrix4(frame).normalize()) : snap(away.normalize(), frame);
      } else if (isPart(item)) {
        // sans contact trouvé : par le haut de la pièce
        dir = v3(new Vector3(...UP).applyMatrix4(new Matrix4().extractRotation(modelMatrix(item))).normalize());
      } else {
        dir = UP;
      }

      // dans le repère du parent : l'animation l'ajoute directement à la position de l'objet
      const parentRot = new Matrix4().extractRotation(item.parent ? modelMatrix(item.parent) : new Matrix4());
      const local = new Vector3(...dir).applyMatrix4(parentRot.invert()).normalize();
      item.userData.klodsInsert = v3(local);
      item.userData.klodsGuided = !!best;

      for (const p of mine) grid.add(p);
    }
  }

  return { placed, guided, touching, ms: Math.round(performance.now() - t0) };
}
