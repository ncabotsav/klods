/**
 * Carte de partage d'un set terminé, dessinée dans le navigateur (1200 × 630, PNG) : la couverture du
 * set dessinée par notre moteur, son nom, le temps de montage. Puis partage par le menu du téléphone
 * (Web Share), ou téléchargement de l'image si le navigateur ne sait pas partager un fichier.
 */
import { asset, SITE_URL } from "./site";
import { wrapText } from "./wrap-text";
import { fr } from "@/i18n/fr";

/*
 * Les images sont des fichiers, pas de l'interface : elles ne lisent pas les jetons CSS.
 * Mêmes valeurs que --stage, --ink, --muted, --accent et --hi du thème clair (globals.css).
 */
export const CARD_COLORS = { bg: "#d4e0eb", ink: "#14202b", muted: "#566573", accent: "#0055bf", hi: "#f2b705" };
const W = 1200;
const H = 630;

export type ShareInfo = { number: string; name: string; hasCover: boolean; finishedMs: number | null; formattedTime: string | null };

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Dessine la carte et la renvoie en PNG. */
export async function drawShareCard(info: ShareInfo): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = CARD_COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = CARD_COLORS.hi;
  ctx.fillRect(0, H - 14, W, 14);

  if (info.hasCover) {
    try {
      const img = await loadImage(asset(`/data/covers/${info.number}.webp`));
      const box = { x: 24, y: 24, w: 640, h: H - 62 };
      const scale = Math.min(box.w / img.width, box.h / img.height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, box.x + (box.w - img.width * scale) / 2, box.y + (box.h - img.height * scale) / 2, img.width * scale, img.height * scale);
    } catch {
      /* pas de couverture : la carte garde le texte seul */
    }
  }

  // polices du site (next/font leur donne un nom à elles), lues dans les jetons
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue("--font-display").trim() || "sans-serif";
  const mono = css.getPropertyValue("--font-mono").trim() || "monospace";
  const body = css.getPropertyValue("--font-body").trim() || "sans-serif";
  await Promise.all([`800 50px ${display}`, `500 24px ${mono}`, `700 34px ${body}`].map((f) => document.fonts.load(f).catch(() => [])));

  const x = info.hasCover ? 712 : 72;
  const w = W - x - 56;
  ctx.fillStyle = CARD_COLORS.accent;
  ctx.font = `800 40px ${display}`;
  ctx.fillText(fr.site.name, x, 112);
  ctx.fillStyle = CARD_COLORS.muted;
  ctx.font = `500 24px ${mono}`;
  ctx.fillText(info.number, x, 190);
  ctx.fillStyle = CARD_COLORS.ink;
  ctx.font = `800 50px ${display}`;
  const lines = wrapText((s) => ctx.measureText(s).width, info.name, w, 3);
  lines.forEach((l, i) => ctx.fillText(l, x, 256 + i * 58));
  ctx.font = `700 34px ${body}`;
  ctx.fillText(info.formattedTime ? fr.share.cardTime(info.formattedTime) : fr.share.cardDone, x, 256 + lines.length * 58 + 44);
  ctx.fillStyle = CARD_COLORS.muted;
  ctx.font = `500 24px ${mono}`;
  ctx.fillText(new URL(SITE_URL).host, x, H - 58);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

/** Partage la carte par le menu du système ; sinon, télécharge l'image. */
export async function shareBuild(info: ShareInfo): Promise<ShareResult> {
  const blob = await drawShareCard(info);
  const file = new File([blob], `klods-${info.number}.png`, { type: "image/png" });
  const text = info.formattedTime ? fr.share.text(info.name, info.formattedTime) : fr.share.textNoTime(info.name);
  const url = `${SITE_URL}/set/${info.number}/`;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: info.name, text: `${text} ${url}` });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "cancelled";
    }
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  return "downloaded";
}
