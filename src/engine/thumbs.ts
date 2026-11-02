/**
 * Miniatures de pièces (navigateur uniquement) : chaque pièce est dessinée seule, de trois quarts,
 * sur fond transparent, une fois par numéro et couleur, puis gardée en mémoire.
 */
import { DirectionalLight, Group, HemisphereLight, Object3D, PerspectiveCamera, Quaternion, Scene, Sphere, Box3, Vector3, WebGLRenderer } from "three";

const SIZE = 128;
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

  const clone = part.clone(true);
  clone.traverse((o) => (o.visible = true));
  part.updateWorldMatrix(true, false);
  const q = new Quaternion();
  const s = new Vector3();
  part.matrixWorld.decompose(new Vector3(), q, s);
  clone.position.set(0, 0, 0);
  clone.quaternion.copy(q);
  clone.scale.copy(s);

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
