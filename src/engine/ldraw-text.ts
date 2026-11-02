/**
 * Lecture du texte d'un fichier LDraw packé, avant et à côté de LDrawLoader :
 * - ROTSTEP devient STEP (LDrawLoader l'ignore, alors que c'est une fin d'étape avec un angle de vue) ;
 * - pour chaque fichier intégré, l'angle de vue en vigueur devant chaque ligne de type 1 ;
 * - les couleurs (!COLOUR) et la description de chaque pièce (première ligne de son « 0 FILE »).
 */

export type Colour = { code: string; name: string; hex: string };

/**
 * Angles de vue absolus (degrés) demandés par « 0 ROTSTEP x y z [ABS|REL|ADD] », déjà résolus à la lecture :
 * ABS les fixe, REL part de la vue par défaut, ADD s'ajoute aux angles en cours. null = vue par défaut.
 */
export type ViewRotation = [number, number, number] | null;

/** Vue par défaut des notices LDraw (LPub) : 23° au-dessus, 45° sur la gauche. */
export const DEFAULT_VIEW: [number, number, number] = [23, -45, 0];

export type ModelText = {
  /** Texte à donner à LDrawLoader (ROTSTEP remplacés par STEP). */
  text: string;
  colours: Map<string, Colour>;
  /** Description par nom de fichier normalisé (« parts/3020.dat » → « Plate  2 x  4 »). */
  descriptions: Map<string, string>;
  /**
   * Pour chaque fichier (nom normalisé, "" pour le modèle principal), les lignes de type 1 dans l'ordre,
   * avec la rotation de vue en vigueur au moment où elles apparaissent.
   */
  references: Map<string, { file: string; rotation: ViewRotation }[]>;
  /** Nombre de commandes STEP et ROTSTEP dans le texte d'origine. */
  stepCommands: number;
};

export const normName = (name: string) => name.trim().replace(/\\/g, "/").toLowerCase();

/** Même règle que LDrawLoader : « s/x.dat » se cherche dans « parts/s/x.dat », « 48/x.dat » dans « p/48/x.dat ». */
export function loaderName(name: string) {
  const n = normName(name);
  if (n.startsWith("s/")) return `parts/${n}`;
  if (n.startsWith("48/")) return `p/${n}`;
  return n;
}

const TYPE1 = /^\s*1(?:\s+\S+){13}\s+(.+?)\s*$/;
const ROTSTEP = /^\s*0\s+ROTSTEP\b\s*(.*)$/i;
const STEP = /^\s*0\s+STEP\b/i;
const FILE = /^\s*0\s+FILE\s+(.+?)\s*$/i;
const COLOUR = /^\s*0\s+!COLOUR\s+(\S+)\s+CODE\s+(\d+)\s+VALUE\s+(#[0-9A-Fa-f]{6})/;

function parseRotation(args: string, current: ViewRotation): ViewRotation {
  const t = args.trim().split(/\s+/);
  if (!t[0] || /^END$/i.test(t[0])) return null;
  const [x, y, z] = t.slice(0, 3).map(Number);
  if (![x, y, z].every(Number.isFinite)) return current;
  const mode = (t[3] ?? "REL").toUpperCase();
  if (mode === "ABS") return [x, y, z];
  const base = mode === "ADD" ? (current ?? DEFAULT_VIEW) : DEFAULT_VIEW;
  return [base[0] + x, base[1] + y, base[2] + z];
}

export function readModelText(raw: string): ModelText {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const colours = new Map<string, Colour>();
  const descriptions = new Map<string, string>();
  const references = new Map<string, { file: string; rotation: ViewRotation }[]>();
  let stepCommands = 0;

  let current = "";
  let rotation: ViewRotation = null;
  let expectDescription = false;
  references.set(current, []);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const file = line.match(FILE);
    if (file) {
      // le premier « 0 FILE » d'un fichier non packé est le modèle principal lui-même
      current = references.size === 1 && references.get("")!.length === 0 && i < 3 ? "" : loaderName(file[1]);
      if (!references.has(current)) references.set(current, []);
      rotation = null;
      expectDescription = current !== "";
      continue;
    }
    if (expectDescription) {
      const d = line.match(/^\s*0\s+(.*\S)\s*$/);
      if (d && !/^(Name:|Author:|!|BFC|\/\/)/i.test(d[1])) descriptions.set(current, d[1]);
      if (line.trim()) expectDescription = false;
    }
    const c = line.match(COLOUR);
    if (c) {
      colours.set(c[2], { code: c[2], name: c[1], hex: c[3] });
      continue;
    }
    const rot = line.match(ROTSTEP);
    if (rot) {
      stepCommands++;
      rotation = parseRotation(rot[1], rotation);
      lines[i] = "0 STEP";
      continue;
    }
    if (STEP.test(line)) {
      stepCommands++;
      continue;
    }
    const ref = line.match(TYPE1);
    if (ref) references.get(current)!.push({ file: loaderName(ref[1]), rotation });
  }

  return { text: lines.join("\n"), colours, descriptions, references, stepCommands };
}

/** Décompresse un fichier .gz s'il l'est encore (un hébergeur peut l'avoir déjà décompressé en route). */
export async function bytesToText(bytes: ArrayBuffer): Promise<string> {
  const u8 = new Uint8Array(bytes);
  if (u8[0] === 0x1f && u8[1] === 0x8b) {
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  }
  return new TextDecoder().decode(u8);
}
