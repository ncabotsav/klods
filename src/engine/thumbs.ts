/**
 * Miniatures de pièces (navigateur uniquement) : chaque pièce est dessinée seule, de trois quarts,
 * sur fond transparent, une fois par numéro et couleur, puis gardée en mémoire.
 */
import { DirectionalLight, Group, HemisphereLight, Object3D, OrthographicCamera, PerspectiveCamera, Quaternion, Scene, Sphere, Box3, Vector3, WebGLRenderer } from "three";

const SIZE = 128;
/** Le modèle LDraw a l'axe Y vers le bas : la scène le retourne, les miniatures aussi. */
const FLIP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI);

/**
 * Orientation d'une pièce dans le modèle, retourné comme dans la scène. On ne prend pas son orientation
 * à l'écran : pendant la construction d'un sous-ensemble, la scène le redresse, et la miniature changerait.
 */
function orientationInModel(part: Object3D): Quaternion {
  const chain: Object3D[] = [];
  for (let o: Object3D | null = part; o && !o.userData.klodsRoot; o = o.parent) chain.unshift(o);
  const q = FLIP.clone();
  for (const o of chain) q.multiply(o.quaternion);
  return q;
}
let renderer: WebGLRenderer | null = null;
let scene: Scene;
let camera: PerspectiveCamera;
const cache = new Map<string, string>();

function setup() {
  renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.setClearColor(0x000000, 0);
  scene = new Scene();
  scene.add(new HemisphereLight(0xffffff, 0x8899aa, 2.2));
  const light = new DirectionalLight(0xffffff, 2.2);
  light.position.set(1, 2, 1.5);
  scene.add(light);
  camera = new PerspectiveCamera(28, 1, 0.1, 100000);
}

/** Image PNG (data URL) de la pièce `part`, telle qu'orientée dans la scène. */
export function partThumbnail(key: string, part: Object3D): string {
  const hit = cache.get(key);
  if (hit) return hit;
  if (!renderer) setup();

  renderer!.setSize(SIZE, SIZE, false);
  const clone = part.clone(true);
  clone.traverse((o) => (o.visible = true));
  clone.position.set(0, 0, 0);
  clone.quaternion.copy(orientationInModel(part));
  clone.scale.set(1, 1, 1);

  const holder = new Group();
  holder.add(clone);
  scene.add(holder);
  const sphere = new Box3().setFromObject(clone).getBoundingSphere(new Sphere());
  holder.position.sub(sphere.center);
  const dist = (sphere.radius / Math.sin(((camera.fov / 2) * Math.PI) / 180)) * 1.05;
  camera.position.set(1, 0.95, 1.35).normalize().multiplyScalar(dist);
  camera.near = dist / 100;
  camera.far = dist * 10;
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);
  renderer!.render(scene, camera);
  const url = renderer!.domElement.toDataURL("image/png");
  scene.remove(holder);

  cache.set(key, url);
  return url;
}

/** 1 unité LDraw (LDU) = 0,4 mm : un tenon fait 20 LDU, soit 8 mm. */
export const MM_PER_LDU = 0.4;

/**
 * Vue d'une pièce par sa plus grande face, à l'échelle réelle : `pxPerMm` pixels CSS par millimètre.
 * Renvoie l'image et sa taille en pixels CSS, à afficher telle quelle.
 */
export function partTopView(part: Object3D, pxPerMm: number): { url: string; width: number; height: number } {
  if (!renderer) setup();
  const clone = part.clone(true);
  clone.traverse((o) => (o.visible = true));
  // orientation dans le modèle (retourné, Y vers le haut), sans la position
  clone.position.set(0, 0, 0);
  clone.quaternion.copy(orientationInModel(part));
  clone.scale.set(1, 1, 1);
  const holder = new Group();
  holder.add(clone);
  scene.add(holder);
  const box = new Box3().setFromObject(clone);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  holder.position.sub(center);

  // on regarde la pièce par sa plus grande face : le long de son côté le plus mince
  // (une plaque vue de dessus, un pneu debout vu de côté)
  const axes = [
    { look: new Vector3(0, 1, 0), up: new Vector3(0, 0, -1), w: size.x, h: size.z, depth: size.y },
    { look: new Vector3(0, 0, 1), up: new Vector3(0, 1, 0), w: size.x, h: size.y, depth: size.z },
    { look: new Vector3(1, 0, 0), up: new Vector3(0, 1, 0), w: size.z, h: size.y, depth: size.x },
  ];
  const view = axes.reduce((a, b) => (b.depth < a.depth ? b : a));
  const cam = new OrthographicCamera(-view.w / 2, view.w / 2, view.h / 2, -view.h / 2, 0.1, view.depth * 4 + 200);
  cam.position.copy(view.look).multiplyScalar(view.depth * 2 + 100);
  cam.up.copy(view.up);
  cam.lookAt(0, 0, 0);

  const width = Math.max(1, view.w * MM_PER_LDU * pxPerMm);
  const height = Math.max(1, view.h * MM_PER_LDU * pxPerMm);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer!.setSize(Math.round(width * dpr), Math.round(height * dpr), false);
  renderer!.render(scene, cam);
  const url = renderer!.domElement.toDataURL("image/png");
  scene.remove(holder);
  renderer!.setSize(SIZE, SIZE, false);
  return { url, width, height };
}
