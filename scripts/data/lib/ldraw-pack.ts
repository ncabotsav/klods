/**
 * Packer LDraw : produit un seul fichier qui contient un modèle et tout ce dont il a besoin
 * (sous-modèles, pièces, sous-pièces, primitives, couleurs). C'est le format que LDrawLoader lit
 * sans bibliothèque à côté, comme les fichiers « _Packed.mpd » des exemples de three.js.
 *
 * Même principe que utils/packLDrawModel.mjs de three.js (licence MIT), réécrit pour Klods :
 * résolution en mémoire, références réécrites vers leur chemin réel, rapport des fichiers introuvables.
 */

/** Lit un fichier de la bibliothèque par son chemin relatif (« parts/3001.dat ») ; null s'il n'existe pas. */
export type LibraryReader = (relativePath: string) => string | null;

export type PackResult = {
  text: string;
  /** Références que ni le modèle ni la bibliothèque ne contiennent. */
  missing: string[];
  /** Nombre de fichiers de la bibliothèque intégrés (pièces, sous-pièces, primitives). */
  libraryFiles: number;
  /** Nombre de sous-modèles déjà présents dans le fichier OMR. */
  embeddedFiles: number;
};

const slashes = (name: string) => name.trim().replace(/\\/g, "/");
/**
 * Nom d'un fichier intégré tel que LDrawLoader le cherchera : il ajoute « parts/ » devant les références
 * « s/… » et « p/ » devant « 48/… », mais pas devant les noms des « 0 FILE ». On écrit donc le nom complet.
 */
const embeddedName = (name: string) => {
  const n = slashes(name);
  if (/^s\//i.test(n)) return `parts/${n}`;
  if (/^48\//i.test(n)) return `p/${n}`;
  return n;
};
const norm = (name: string) => slashes(name).toLowerCase();

/** Les chemins où LDraw cherche une référence, dans l'ordre. */
function candidates(name: string): string[] {
  const n = norm(name);
  if (n.startsWith("parts/") || n.startsWith("p/")) return [n];
  if (n.startsWith("s/")) return [`parts/${n}`];
  if (n.startsWith("48/") || n.startsWith("8/")) return [`p/${n}`];
  return [`parts/${n}`, `p/${n}`];
}

/** Une ligne de type 1 : « 1 couleur x y z a b c d e f g h i fichier » ; le nom de fichier peut contenir des espaces. */
const TYPE1 = /^(\s*1(?:\s+\S+){13}\s+)(.+?)\s*$/;

type Block = { name: string | null; lines: string[] };

/** Découpe un fichier MPD en blocs « 0 FILE ». Le premier bloc est le modèle principal. */
export function splitMpd(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const m = line.match(/^\s*0\s+FILE\s+(.+?)\s*$/);
    if (m) {
      current = { name: m[1], lines: [] };
      blocks.push(current);
    } else {
      if (!current) {
        current = { name: null, lines: [] };
        blocks.push(current);
      }
      current.lines.push(line);
    }
  }
  // un fichier .ldr simple, ou des lignes vides avant le premier « 0 FILE »
  if (blocks.length > 1 && blocks[0].name === null && blocks[0].lines.every((l) => !l.trim())) blocks.shift();
  return blocks;
}

export function packModel(modelText: string, ldconfig: string, read: LibraryReader): PackResult {
  const blocks = splitMpd(modelText);
  const embedded = new Map<string, Block>();
  for (const b of blocks) if (b.name) embedded.set(norm(b.name), b);

  const library = new Map<string, string[]>(); // chemin réel -> lignes réécrites
  const missing = new Set<string>();
  const visiting = new Set<string>();

  /** Réécrit les références d'une liste de lignes et intègre ce qu'elles appellent. */
  const rewrite = (lines: string[]): string[] =>
    lines.map((line) => {
      const m = line.match(TYPE1);
      if (!m) return line;
      const ref = m[2];
      // sous-modèle ou pièce non officielle du fichier OMR : même nom que son « 0 FILE », barres obliques normales
      // (LDrawLoader ne retrouve pas « s\pièce.dat » écrit avec une barre inversée)
      if (embedded.has(norm(ref))) return m[1] + embeddedName(embedded.get(norm(ref))!.name!);
      const real = resolve(ref);
      return real ? m[1] + real : line;
    });

  const resolve = (ref: string): string | null => {
    for (const c of candidates(ref)) {
      if (library.has(c) || visiting.has(c)) return c;
      const content = read(c);
      if (content === null) continue;
      visiting.add(c);
      const lines = content.replace(/\r\n?/g, "\n").split("\n").filter((l) => !/^\s*0\s+FILE\s/.test(l));
      library.set(c, rewrite(lines));
      visiting.delete(c);
      return c;
    }
    missing.add(norm(ref));
    return null;
  };

  const out: string[] = [ldconfig.replace(/\r\n?/g, "\n").trimEnd(), ""];
  for (const [i, b] of blocks.entries()) {
    // Le modèle principal s'écrit sans « 0 FILE » : LDrawLoader prend le texte avant le premier « 0 FILE ».
    if (i > 0 && b.name) out.push(`0 FILE ${embeddedName(b.name)}`);
    out.push(...rewrite(b.lines));
  }
  for (const [p, lines] of library) {
    out.push(`0 FILE ${p}`, ...lines);
  }
  // LDrawLoader abandonne tout le modèle si une seule référence manque : on pose une pièce vide à sa
  // place. Le modèle se charge, seule cette pièce est invisible, et le rapport la compte.
  for (const name of missing) {
    out.push(`0 FILE ${name}`, "0 Pièce introuvable dans la bibliothèque LDraw (remplacée par Klods)", "0 !LDRAW_ORG Unofficial_Part");
  }
  out.push("");

  return {
    text: out.join("\n"),
    missing: [...missing].sort(),
    libraryFiles: library.size,
    embeddedFiles: Math.max(0, embedded.size - (blocks[0]?.name ? 1 : 0)),
  };
}
