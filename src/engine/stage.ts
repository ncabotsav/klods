/**
 * Scène 3D du lecteur de notices (navigateur uniquement).
 *
 * - Affiche le modèle tel qu'il est à une étape donnée : les pièces des étapes précédentes, celles de
 *   l'étape, et rien d'autre. Pendant la construction d'un sous-ensemble, seul ce sous-ensemble est visible.
 * - Cadre la caméra une fois par contexte (modèle principal ou sous-ensemble) : la vue ne saute pas
 *   d'une étape à l'autre, comme dans une notice où l'échelle reste la même.
 * - Fait descendre les nouvelles pièces à leur place et les entoure, sauf si l'utilisateur réduit les animations.
 * - Ne dessine que quand quelque chose change (caméra, animation, étape), pour ménager la batterie.
 */
import {
  ACESFilmicToneMapping,
  ArrowHelper,
  Box3,
  BoxHelper,
  Color,
  Euler,
  Group,
  MathUtils,
  Object3D,
  Quaternion,
  PMREMGenerator,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { DEFAULT_VIEW } from "./ldraw-text.ts";
import type { Step, StepPlan } from "./steps.ts";

type Drop = { obj: Object3D; from: Vector3; to: Vector3; t0: number };

export type StageOptions = {
  /** Couleur de surbrillance des nouvelles pièces (CSS). */
  highlight?: string;
  /** Appelé à chaque image dessinée, avec sa durée, pour mesurer la fluidité. */
  onFrame?: (ms: number) => void;
  /** Garde l'image après le rendu, pour la copier (vue impression). */
  preserveDrawingBuffer?: boolean;
};

const DROP_MS = 650;
/** Écart entre deux pièces d'une même étape, et durée totale maximale de ces départs décalés. */
const DROP_GAP_MS = 220;
const DROP_SPREAD_MS = 1200;
/** Au-delà, on n'entoure pas les pièces : les cadres se chevauchent et brouillent l'étape. */
const MAX_HIGHLIGHTS = 3;
const FLIP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI);

/**
 * Direction de la caméra (repère de la scène, Y vers le haut) pour des angles de vue LDraw en degrés.
 * LDraw tourne le modèle de (x, y, z) puis le regarde de face : la caméra est donc à l'inverse.
 */
export function viewDirection([x, y, z]: [number, number, number]): Vector3 {
  const q = new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(x), MathUtils.degToRad(y), MathUtils.degToRad(z), "XYZ"));
  const v = new Vector3(0, 0, -1).applyQuaternion(q.invert());
  return new Vector3(v.x, -v.y, -v.z).normalize();
}

export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(35, 1, 1, 100000);
  readonly controls: OrbitControls;

  private root = new Group();
  private model: Group | null = null;
  private plan: StepPlan | null = null;
  private current = -1;
  private drops: Drop[] = [];
  private highlights: BoxHelper[] = [];
  private arrows: ArrowHelper[] = [];
  /** Page de travail : flèches de la direction d'arrivée des pièces de l'étape. */
  private showArrows = false;
  private framed = new Map<Object3D, Sphere>();
  private dirty = true;
  private raf = 0;
  private resizeObserver: ResizeObserver;
  private reducedMotion: boolean;
  private highlightColor: Color;

  constructor(
    private container: HTMLElement,
    private options: StageOptions = {},
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!options.preserveDrawingBuffer });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.touchAction = "none";
    container.prepend(this.renderer.domElement);

    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // LDraw a l'axe Y vers le bas : on retourne le modèle une fois pour toutes
    this.root.rotation.x = Math.PI;
    this.scene.add(this.root);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.addEventListener("change", () => (this.dirty = true));

    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.highlightColor = new Color(options.highlight || "#f2b705");

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.loop();
  }

  setModel(model: Group, plan: StepPlan) {
    if (this.model) this.root.remove(this.model);
    this.model = model;
    this.plan = plan;
    this.framed.clear();
    this.root.add(model);
    this.current = -1;
  }

  get stepCount() {
    return this.plan?.steps.length ?? 0;
  }

  /** Affiche l'étape `index` (0 = la première). `animate` fait descendre les nouvelles pièces. */
  showStep(index: number, animate = false) {
    const plan = this.plan;
    const model = this.model;
    if (!plan || !model || !plan.steps.length) return;
    const i = Math.max(0, Math.min(plan.steps.length - 1, index));
    const step = plan.steps[i];
    const previous = this.current;
    const contextChanged = previous < 0 || plan.steps[previous]?.context !== step.context;
    const viewChanged = previous < 0 || String(plan.steps[previous].rotation) !== String(step.rotation);
    this.current = i;

    this.clearEffects();
    if (contextChanged) this.orientFor(step);
    this.applyVisibility(step);
    this.root.updateMatrixWorld(true);
    if (contextChanged || viewChanged) this.frame(step);

    const added = [...step.parts, ...step.assemblies];
    if (added.length <= MAX_HIGHLIGHTS) {
      for (const o of added) {
        const box = new BoxHelper(o, this.highlightColor);
        const mat = box.material as { depthTest: boolean; transparent: boolean; opacity: number };
        mat.depthTest = false;
        mat.transparent = true;
        mat.opacity = 0.85;
        box.renderOrder = 10;
        this.scene.add(box);
        this.highlights.push(box);
      }
    }

    if (this.showArrows) {
      for (const o of added) {
        const insert = o.userData.klodsInsert as [number, number, number] | undefined;
        if (!insert) continue;
        const q = o.parent!.getWorldQuaternion(new Quaternion());
        const dir = new Vector3(...insert).applyQuaternion(q).normalize();
        const size = new Box3().setFromObject(o).getBoundingSphere(new Sphere()).radius;
        const at = new Box3().setFromObject(o).getCenter(new Vector3());
        const length = Math.max(size * 2, 30);
        const arrow = new ArrowHelper(dir, at.addScaledVector(dir, size + length), length, o.userData.klodsGuided ? 0x0055bf : 0xd01012, length * 0.3, length * 0.18);
        arrow.setDirection(dir.clone().negate());
        arrow.renderOrder = 11;
        this.scene.add(arrow);
        this.arrows.push(arrow);
      }
    }

    if (animate && !this.reducedMotion) {
      // chaque pièce glisse vers sa place le long de sa direction d'arrivée (insertion.ts),
      // l'une après l'autre ; la distance suit la taille de la pièce, bornée par celle du contexte
      const context = this.sphereOf(step.context).radius;
      const gap = Math.min(DROP_GAP_MS, (DROP_SPREAD_MS / Math.max(1, added.length - 1)) | 0);
      const start = performance.now();
      added.forEach((o, i) => {
        o.userData.klodsBase ??= o.position.clone();
        const base = o.userData.klodsBase as Vector3;
        const size = (o.userData.klodsSize ??= new Box3().setFromObject(o).getBoundingSphere(new Sphere()).radius) as number;
        const lift = Math.min(Math.max(size * 1.6, 30), Math.max(context * 0.35, 30));
        const insert = o.userData.klodsInsert as [number, number, number] | undefined;
        let from: Vector3;
        if (insert) from = base.clone().addScaledVector(new Vector3(...insert), lift);
        else from = o.parent!.worldToLocal(o.getWorldPosition(new Vector3()).add(new Vector3(0, lift, 0)));
        o.position.copy(from);
        this.drops.push({ obj: o, from, to: base, t0: start + i * gap });
      });
    }
    this.dirty = true;
  }

  /** Le modèle terminé, entier, dans la vue par défaut (couverture, fin du montage). */
  showAll() {
    const model = this.model;
    if (!model) return;
    this.clearEffects();
    this.current = -1;
    this.root.quaternion.copy(FLIP);
    model.traverse((o) => {
      o.visible = true;
      if (o.userData.klodsBase) o.position.copy(o.userData.klodsBase);
    });
    this.root.updateMatrixWorld(true);
    this.frameContext(model, null);
    this.dirty = true;
  }

  /** Flèches des directions d'arrivée (page de travail) : bleues si guidées par un contact, rouges sinon. */
  setInsertArrows(on: boolean) {
    this.showArrows = on;
    if (this.current >= 0) this.showStep(this.current);
  }

  /** Rotation lente du modèle (couverture), sauf si l'utilisateur réduit les animations. */
  setAutoRotate(on: boolean) {
    this.controls.autoRotate = on && !this.reducedMotion;
    this.controls.autoRotateSpeed = 1.5;
    this.dirty = true;
  }

  /** Dessine tout de suite et renvoie l'image (PNG), pour la vue impression. */
  snapshot(): string {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }

  /** Vue d'ensemble du contexte de l'étape en cours, comme au premier affichage. */
  reframe() {
    const step = this.plan?.steps[this.current];
    if (step) this.frame(step);
    else if (this.model) this.frameContext(this.model, null);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.clearEffects();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ---------------------------------------------------------------------------

  private applyVisibility(step: Step) {
    const model = this.model!;
    const path = new Set<Object3D>([model, ...step.path]);
    model.traverse((o) => {
      if (o === model) return;
      const at = o.userData.klodsStep;
      // une pièce dans une pièce suit sa pièce ; les objets sans étape (-1) suivent leur parent
      if (typeof at === "number" && at >= 0) o.visible = at <= step.index;
      else o.visible = true;
      if (o.userData.klodsBase) o.position.copy(o.userData.klodsBase);
    });
    // le chemin jusqu'au sous-ensemble en construction est visible, mais rien d'autre autour
    for (let k = 0; k < step.path.length; k++) {
      const parent = k === 0 ? model : step.path[k - 1];
      for (const child of parent.children) child.visible = child === step.path[k] ? true : false;
    }
    for (const p of path) p.visible = true;
  }

  /**
   * Un sous-ensemble se construit droit, comme dans une notice, et non dans l'angle où il sera posé :
   * on tourne toute la scène pour annuler sa rotation dans le modèle.
   */
  private orientFor(step: Step) {
    const q = new Quaternion();
    for (const p of step.path) q.multiply(p.quaternion);
    this.root.quaternion.copy(FLIP).multiply(q.invert());
  }

  private sphereOf(context: Object3D): Sphere {
    let s = this.framed.get(context);
    if (!s) {
      // tout le contexte, toutes étapes confondues : la caméra ne bouge pas pendant qu'on construit
      const hidden: Object3D[] = [];
      context.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      context.updateMatrixWorld(true);
      s = new Box3().setFromObject(context).getBoundingSphere(new Sphere());
      for (const o of hidden) o.visible = false;
      this.framed.set(context, s);
    }
    return s;
  }

  private frame(step: Step) {
    this.frameContext(step.context, step.rotation);
  }

  private frameContext(context: Object3D, rotation: [number, number, number] | null) {
    const sphere = this.sphereOf(context);
    const fov = (this.camera.fov * Math.PI) / 180;
    const fitH = sphere.radius / Math.sin(fov / 2);
    const fitW = sphere.radius / Math.sin(Math.atan(Math.tan(fov / 2) * this.camera.aspect));
    const dist = Math.max(fitH, fitW) * 1.08;
    // vue de trois quarts, de face et un peu au-dessus, sauf si l'étape demande un autre angle (ROTSTEP)
    const dir = viewDirection(rotation ?? DEFAULT_VIEW);
    this.controls.target.copy(sphere.center);
    this.camera.position.copy(sphere.center).addScaledVector(dir, dist);
    this.camera.near = Math.max(0.1, dist / 200);
    this.camera.far = dist * 20;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.dirty = true;
  }

  private clearEffects() {
    for (const d of this.drops) {
      d.obj.position.copy(d.to);
      d.obj.visible = true;
    }
    this.drops = [];
    for (const h of this.highlights) {
      this.scene.remove(h);
      h.geometry.dispose();
      (h.material as { dispose(): void }).dispose();
    }
    this.highlights = [];
    for (const a of this.arrows) {
      this.scene.remove(a);
      a.dispose();
    }
    this.arrows = [];
  }

  private resize() {
    const r = this.container.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    if (this.drops.length) {
      for (let k = this.drops.length - 1; k >= 0; k--) {
        const d = this.drops[k];
        const t = Math.max(0, Math.min(1, (now - d.t0) / DROP_MS));
        // une pièce qui n'est pas encore partie reste cachée, puis glisse
        d.obj.visible = now >= d.t0;
        const e = 1 - Math.pow(1 - t, 3);
        d.obj.position.lerpVectors(d.from, d.to, e);
        if (t >= 1) this.drops.splice(k, 1);
      }
      for (const h of this.highlights) h.update();
      this.dirty = true;
    }
    if (this.controls.update()) this.dirty = true;
    if (!this.dirty) return;
    this.dirty = false;
    const t0 = performance.now();
    this.renderer.render(this.scene, this.camera);
    this.options.onFrame?.(performance.now() - t0);
  };
}
