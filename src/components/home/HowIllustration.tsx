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

/** 1. Tape le numéro : le numéro de la boîte, tapé tel quel dans la barre de recherche. */
function TypeNumber() {
  const p = iso(54, 40);
  const box = { w: 8, d: 4, h: 4 };
  const [lx, ly] = p(4, box.d, 2.1);
  return (
    <svg viewBox="0 0 240 150" className={styles.svg} aria-hidden="true">
      <g className={styles.card}>
        <polygon points={pts([p(box.w, 0, box.h), p(box.w, box.d, box.h), p(box.w, box.d, 0), p(box.w, 0, 0)])} className={styles.shade} />
        <polygon points={pts([p(0, box.d, box.h), p(box.w, box.d, box.h), p(box.w, box.d, 0), p(0, box.d, 0)])} />
        <polygon points={pts([p(0, 0, box.h), p(box.w, 0, box.h), p(box.w, box.d, box.h), p(0, box.d, box.h)])} />
      </g>
      {/* étiquette du numéro, sur la face avant */}
      <g className={styles.hi}>
        <polygon points={pts([p(1.4, box.d, 3.1), p(6.6, box.d, 3.1), p(6.6, box.d, 1.1), p(1.4, box.d, 1.1)])} />
      </g>
      <text className={styles.label} transform={`translate(${lx},${ly}) skewY(30)`} textAnchor="middle" dominantBaseline="middle">
        4915
      </text>
      {/* du numéro de la boîte au même numéro dans la barre */}
      <path d="M61.5 86v17" className={styles.arrow} />
      <path d="M55 97l6.5 7 6.5-7" className={styles.arrow} />
      <rect x="14" y="110" width="212" height="30" rx="15" className={styles.card} />
      <circle cx="32" cy="124" r="5.5" className={styles.line} />
      <path d="M36 128l4 4" className={styles.line} />
      <text x="50" y="125.5" className={styles.barText} dominantBaseline="middle">
        4915
      </text>
      <path d="M94 117v16" className={styles.caret} />
      <circle cx="211" cy="125" r="11" className={styles.accent} />
      <path d="M205 125h12M212 120l5 5-5 5" className={styles.accentInk} />
    </svg>
  );
}

/** 2. Vérifie tes pièces : deux pièces, leur nombre, une coche. */
function CheckParts() {
  return (
    <svg viewBox="0 0 240 150" className={styles.svg} aria-hidden="true">
      <Brick ox={74.8} oy={50} w={2} d={4} h={3} tone="hi" />
      <Brick ox={166.5} oy={66} w={2} d={1} h={3} />
      {[
        [66.8, 128.5, "4×"],
        [170.6, 128.5, "2×"],
      ].map(([x, y, n]) => (
        <g key={String(n)}>
          <rect x={Number(x) - 16} y={Number(y) - 9.5} width="32" height="19" rx="11" ry="9.5" className={styles.chip} />
          <text x={Number(x)} y={Number(y) + 1} className={styles.small} textAnchor="middle" dominantBaseline="middle">
            {n}
          </text>
        </g>
      ))}
      <circle cx="211.1" cy="128.75" r="9.75" className={styles.hi} />
      <path d="M207.1 128.9l3.5 3.5 5.8-6.6" className={styles.check} />
    </svg>
  );
}

/** 3. Suis chaque étape : une brique descend sur la plaque, comme dans la vue 3D. */
function FollowSteps() {
  return (
    <svg viewBox="0 0 240 150" className={styles.svg} aria-hidden="true">
      <Brick ox={120} oy={76} w={4} d={4} h={1} tone="stage" />
      <Brick ox={128} oy={30} w={2} d={2} h={3} tone="hi" />
      <path d="M172.1 34v42" className={styles.arrow} />
      <path d="M165.1 68.5l7 9 7-9" className={styles.arrowHead} />
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
