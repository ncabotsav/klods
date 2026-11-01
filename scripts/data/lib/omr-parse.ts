/**
 * Lecture d'une fiche de set OMR (https://library.ldraw.org/omr/sets/<id>).
 * La page est rendue côté serveur : le titre du set, puis un bloc par modèle avec son nom, son auteur,
 * trois indicateurs (pièces, motifs, autocollants manquants) et un lien « Download » vers le fichier.
 */
export type OmrModel = {
  /** Identifiant du fichier sur library.ldraw.org (le nombre dans /media/omr_models/<id>/). */
  fileId: number;
  name: string;
  author: string;
  fileName: string;
  url: string;
  /** Version du fichier (paramètre ?v= de l'URL), change quand le fichier est mis à jour. */
  version: string;
  missingParts: boolean;
  missingPatterns: boolean;
  missingStickers: boolean;
};

export type OmrSet = {
  omrId: number;
  /** Numéro du set tel que l'OMR l'écrit, par exemple « 8094-1 ». */
  number: string;
  title: string;
  models: OmrModel[];
};

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

const text = (html: string) => decode(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Aplatit la page : sans scripts, sans SVG, sans commentaires Livewire, espaces réduits. */
function flatten(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ");
}

const flag = (block: string, label: string) => {
  const m = block.match(new RegExp(`${label}\\s*</span>\\s*<br\\s*/?>\\s*(Yes|No)`, "i"));
  return m ? m[1].toLowerCase() === "yes" : false;
};

export function parseOmrSetPage(html: string, omrId: number): OmrSet {
  const flat = flatten(html);
  const main = flat.slice(flat.indexOf("<main"));

  // Le premier gros bloc de la page : « 8094-1 - TECHNIC Control Centre »
  const titleMatch = main.match(/<div[^>]*text-xl[^>]*>([^<]+)<\/div>/);
  const title = titleMatch ? text(titleMatch[1]) : "";
  const numberMatch = title.match(/^(\S+-\d+)\s*-\s*/);
  const number = numberMatch ? numberMatch[1] : title.split(" ")[0];

  // Un modèle = tout ce qui se trouve entre deux « Author: » ; on remonte au nom juste avant.
  const models: OmrModel[] = [];
  const starts = [...main.matchAll(/<span[^>]*>\s*Author:\s*<\/span>/g)].map((m) => m.index ?? 0);
  for (let i = 0; i < starts.length; i++) {
    const before = main.slice(starts[i - 1] ?? 0, starts[i]);
    const nameMatches = [...before.matchAll(/<div[^>]*font-bold[^>]*>([^<]+)<\/div>/g)];
    const name = nameMatches.length ? text(nameMatches[nameMatches.length - 1][1]) : "";
    const block = main.slice(starts[i], starts[i + 1] ?? main.length);
    const author = text(block.slice(block.indexOf("</span>") + 7, block.indexOf("</div>")));
    const link = block.match(/href="(https?:\/\/[^"]*\/omr_models\/(\d+)\/([^"?]+\.(?:mpd|ldr))(?:\?v=([^"]*))?)"/i);
    if (!link) continue;
    models.push({
      fileId: Number(link[2]),
      name,
      author,
      fileName: decodeURIComponent(link[3]),
      url: decode(link[1]),
      version: link[4] ?? "",
      missingParts: flag(block, "Missing Parts"),
      missingPatterns: flag(block, "Missing Patterns"),
      missingStickers: flag(block, "Missing Stickers"),
    });
  }

  return { omrId, number, title: title.replace(/^\S+-\d+\s*-\s*/, ""), models };
}
