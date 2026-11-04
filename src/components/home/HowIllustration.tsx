import styles from "./HowIllustration.module.css";

/*
 * Dessins au trait des trois étapes de « Comment ça marche », dans l'esprit des notices : traits
 * sombres, faces claires, une touche de jaune. Briques génériques dessinées par nous (pas de logo,
 * pas de figurine), couleurs par les jetons du thème : les dessins suivent le mode clair ou sombre.
 */

const U = 9; // une unité de brique, en pixels
const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;

/** Projection isométrique d'un point (a vers la droite, b vers la gauche, c vers le haut). */
const iso = (ox: number, oy: number) => (a: number, b: number, c: number) => [ox + (a - b) * COS * U, oy + (a + b) * SIN * U - c * U] as const;
const pts = (list: (readonly [number, number])[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

type Tone = "card" | "hi" | "stage";

/** Une brique de `w` × `d` tenons et `h` unités de haut, posée en (ox, oy) : trois faces et ses tenons. */
function Brick({ ox, oy, w, d, h, tone = "card" }: { ox: number; oy: number; w: number; d: number; h: number; tone?: Tone }) {
  const p = iso(ox, oy);
  const W = w * 2;
  const D = d * 2;
  const top = pts([p(0, 0, h), p(W, 0, h), p(W, D, h), p(0, D, h)]);
  const right = pts([p(W, 0, h), p(W, D, h), p(W, D, 0), p(W, 0, 0)]);
  const left = pts([p(0, D, h), p(W, D, h), p(W, D, 0), p(0, D, 0)]);
  const studs: [number, number][] = [];
  for (let i = 0; i < d; i++) for (let j = 0; j < w; j++) studs.push([j * 2 + 1, i * 2 + 1]);
  // les tenons du fond d'abord, pour qu'ils passent derrière ceux de devant
  studs.sort((s, t) => s[0] + s[1] - (t[0] + t[1]));
  return (
    <g className={styles[tone]}>
      <polygon points={right} className={styles.shade} />
      <polygon points={left} />
      <polygon points={top} />
      {studs.map(([a, b]) => {
        const [cx, cy] = p(a, b, h);
        return (
          <g key={`${a}-${b}`}>
            <path d={`M${cx - 0.6 * U * COS * 1.15},${cy} v${-0.45 * U} a${0.6 * U * COS * 1.15},${0.6 * U * SIN * 1.15} 0 0 0 ${1.2 * U * COS * 1.15},0 v${0.45 * U}`} />
            <ellipse cx={cx} cy={cy - 0.45 * U} rx={0.6 * U * COS * 1.15} ry={0.6 * U * SIN * 1.15} />
          </g>
        );
      })}
    </g>
  );
}

/** 1. Tape le numéro : la boîte et son numéro, un téléphone où on le tape. */
function TypeNumber() {
  const p = iso(70, 58);
  const box = { w: 9, d: 6, h: 6 };
  return (
    <svg viewBox="0 0 240 150" className={styles.svg} aria-hidden="true">
      <g className={styles.card}>
        <polygon points={pts([p(box.w, 0, box.h), p(box.w, box.d, box.h), p(box.w, box.d, 0), p(box.w, 0, 0)])} className={styles.shade} />
        <polygon points={pts([p(0, box.d, box.h), p(box.w, box.d, box.h), p(box.w, box.d, 0), p(0, box.d, 0)])} />
        <polygon points={pts([p(0, 0, box.h), p(box.w, 0, box.h), p(box.w, box.d, box.h), p(0, box.d, box.h)])} />
      </g>
      {/* étiquette du numéro, sur la face avant */}
      <g className={styles.hi}>
        <polygon points={pts([p(2, box.d, 4.4), p(7, box.d, 4.4), p(7, box.d, 2.2), p(2, box.d, 2.2)])} />
      </g>
      <text className={styles.label} transform={`translate(${p(4.5, box.d, 3.3).join(",")}) skewY(30)`} textAnchor="middle" dominantBaseline="middle">
        4915
      </text>
      {/* téléphone : le numéro tapé dans la recherche */}
      <g className={styles.card}>
        <rect x="168" y="30" width="50" height="92" rx="8" />
        <rect x="174" y="44" width="38" height="13" rx="3" className={styles.stageFill} />
      </g>
      <text x="200" y="51" className={styles.small} textAnchor="middle" dominantBaseline="middle">
        4915
      </text>
      <circle cx="180" cy="50.5" r="3" className={styles.line} />
      <path d="M182.2 52.7l2.3 2.3" className={styles.line} />
      <rect x="174" y="64" width="38" height="22" rx="3" className={`${styles.line} ${styles.stageFill}`} />
      <rect x="174" y="91" width="38" height="22" rx="3" className={`${styles.line} ${styles.stageFill}`} />
      <path d="M150 92c6-6 10-8 16-8" className={styles.arrow} />
      <path d="M161 80l5 4-5 4" className={styles.arrow} />
    </svg>
  );
}

/** 2. Vérifie tes pièces : deux pièces, leur nombre, une coche. */
function CheckParts() {
  return (
    <svg viewBox="0 0 240 150" className={styles.svg} aria-hidden="true">
      <Brick ox={62} oy={50} w={2} d={4} h={3} tone="hi" />
      <Brick ox={164} oy={66} w={2} d={1} h={3} />
      {[
        [54, 130, "4×"],
        [168, 122, "2×"],
      ].map(([x, y, n]) => (
        <g key={String(n)}>
          <rect x={Number(x) - 16} y={Number(y) - 11} width="32" height="22" rx="11" className={styles.chip} />
          <text x={Number(x)} y={Number(y) + 1} className={styles.small} textAnchor="middle" dominantBaseline="middle">
            {n}
          </text>
        </g>
      ))}
      <circle cx="212" cy="122" r="12" className={styles.hi} />
      <path d="M206 122l4.5 4.5 7.5-8.5" className={styles.check} />
    </svg>
  );
}

/** 3. Suis chaque étape : une brique descend sur la plaque, comme dans la vue 3D. */
function FollowSteps() {
  return (
    <svg viewBox="0 0 240 150" className={styles.svg} aria-hidden="true">
      <Brick ox={120} oy={76} w={4} d={4} h={1} tone="stage" />
      <Brick ox={128} oy={30} w={2} d={2} h={3} tone="hi" />
      <path d="M62 34v42" className={styles.arrow} />
      <path d="M55 68l7 9 7-9" className={styles.arrowHead} />
    </svg>
  );
}

const DRAWINGS = [TypeNumber, CheckParts, FollowSteps];

/** Dessin de l'étape `index` (0, 1 ou 2) de « Comment ça marche ». */
export default function HowIllustration({ index }: { index: number }) {
  const Drawing = DRAWINGS[index];
  return Drawing ? (
    <div className={styles.frame}>
      <Drawing />
    </div>
  ) : null;
}
