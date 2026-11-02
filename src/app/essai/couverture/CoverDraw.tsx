"use client";

import { useEffect } from "react";
import { asset } from "@/lib/site";
import { fr } from "@/i18n/fr";
import styles from "./CoverDraw.module.css";

/** Ce que le script `data:covers` demande pour un set. */
export type DrawRequest = { file: string; bytes: number; number: string; name: string; theme: string | null; year: number | null; parts: number; steps: number };
export type DrawResult = { cover: string; card: string; ms: number; loadMs: number };

declare global {
  interface Window {
    klodsDraw?: (req: DrawRequest) => Promise<DrawResult>;
  }
}

const COVER_W = 640;
const COVER_H = 480;
const CARD_W = 1200;
const CARD_H = 630;
/*
 * Les images sont des fichiers, pas de l'interface : elles ne lisent pas les jetons CSS.
 * Mêmes valeurs que --stage, --ink, --muted, --accent et --hi du thème clair (globals.css).
 */
const CARD = { bg: "#d4e0eb", ink: "#14202b", muted: "#566573", accent: "#0055bf", hi: "#f2b705" };

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Cadre des pixels non transparents de l'image : le modèle, sans le vide autour. */
function opaqueBox(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? { x: 0, y: 0, w: width, h: height } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Pose le modèle au plus grand dans le rectangle (x, y, w, h), centré, avec une marge. */
function drawFitted(ctx: CanvasRenderingContext2D, img: HTMLImageElement, box: ReturnType<typeof opaqueBox>, x: number, y: number, w: number, h: number, margin: number) {
  const scale = Math.min((w * (1 - 2 * margin)) / box.w, (h * (1 - 2 * margin)) / box.h);
  const dw = box.w * scale;
  const dh = box.h * scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, box.x, box.y, box.w, box.h, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Coupe un titre en lignes qui tiennent dans `width`, au plus `max` lignes (la dernière finit par « … »). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > max) {
    const kept = lines.slice(0, max);
    let last = kept[max - 1];
    while (ctx.measureText(`${last}…`).width > width && last.includes(" ")) last = last.slice(0, last.lastIndexOf(" "));
    kept[max - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

/**
 * Page de dessin des couvertures (non indexée) : le script `npm run data:covers` l'ouvre dans Chromium
 * sans écran et appelle `window.klodsDraw()` pour chaque set. Le modèle fini est dessiné avec le moteur
 * du site, sur fond transparent (couverture), puis posé sur une carte de partage 1200 × 630.
 */
export default function CoverDraw() {
  useEffect(() => {
    let stage: import("@/engine/stage").Stage | null = null;
    let previous: import("three").Group | null = null;

    window.klodsDraw = async (req) => {
      const t0 = performance.now();
      const [{ bytesToText }, { loadModelText }, { buildSteps }, { Stage }] = await Promise.all([
        import("@/engine/ldraw-text"),
        import("@/engine/load"),
        import("@/engine/steps"),
        import("@/engine/stage"),
      ]);
      const res = await fetch(asset(`/${req.file}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await bytesToText(await res.arrayBuffer());
      const { model, info } = await loadModelText(raw, { smoothNormals: req.bytes < 2_000_000 });
      const plan = buildSteps(model, info);

      const scene = document.getElementById("scene")!;
      stage ??= new Stage(scene, { preserveDrawingBuffer: true });
      stage.renderer.setPixelRatio(1);
      stage.setModel(model, plan);
      stage.showAll();
      // libère la géométrie du set précédent : la page dessine des centaines de sets à la suite
      previous?.traverse((o) => {
        const mesh = o as import("three").Mesh;
        mesh.geometry?.dispose();
      });
      previous = model;
      const tLoad = performance.now() - t0;
      const shot = await loadImage(stage.snapshot());
      const box = opaqueBox(shot);

      // couverture : le modèle seul, recadré au plus juste, fond transparent
      const cover = document.createElement("canvas");
      cover.width = COVER_W;
      cover.height = COVER_H;
      drawFitted(cover.getContext("2d")!, shot, box, 0, 0, COVER_W, COVER_H, 0.06);

      // carte de partage : le modèle à gauche, le nom et les chiffres à droite
      const card = document.createElement("canvas");
      card.width = CARD_W;
      card.height = CARD_H;
      const ctx = card.getContext("2d")!;
      ctx.fillStyle = CARD.bg;
      ctx.fillRect(0, 0, CARD_W, CARD_H);
      drawFitted(ctx, shot, box, 24, 24, 660, CARD_H - 62, 0.04);
      ctx.fillStyle = CARD.hi;
      ctx.fillRect(0, CARD_H - 14, CARD_W, 14);

      await Promise.all(
        ['800 50px "Archivo Variable"', '500 24px "IBM Plex Mono"', '400 28px "Atkinson Hyperlegible"', '700 28px "Atkinson Hyperlegible"'].map((f) =>
          document.fonts.load(f),
        ),
      );
      const x = 720;
      const w = CARD_W - x - 56;
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = CARD.accent;
      ctx.font = '800 40px "Archivo Variable", "Arial Black", sans-serif';
      ctx.fillText(fr.site.name, x, 112);
      ctx.fillStyle = CARD.muted;
      ctx.font = '500 24px "IBM Plex Mono", monospace';
      ctx.fillText([req.number, req.theme, req.year].filter(Boolean).join(" · "), x, 196);
      ctx.fillStyle = CARD.ink;
      ctx.font = '800 50px "Archivo Variable", "Arial Black", sans-serif';
      const lines = wrap(ctx, req.name, w, 4);
      lines.forEach((l, i) => ctx.fillText(l, x, 262 + i * 58));
      ctx.fillStyle = CARD.muted;
      ctx.font = '400 28px "Atkinson Hyperlegible", sans-serif';
      ctx.fillText(fr.covers.card(req.parts, req.steps), x, 262 + lines.length * 58 + 34);
      ctx.fillStyle = CARD.ink;
      ctx.font = '700 26px "Atkinson Hyperlegible", sans-serif';
      wrap(ctx, fr.covers.tagline, w, 2).forEach((l, i, all) => ctx.fillText(l, x, CARD_H - 58 - (all.length - 1 - i) * 34));

      return { cover: cover.toDataURL("image/webp", 0.86), card: card.toDataURL("image/jpeg", 0.84), ms: Math.round(performance.now() - t0), loadMs: Math.round(tLoad) };
    };
    document.body.dataset.klodsReady = "1";
    return () => {
      delete window.klodsDraw;
      stage?.dispose();
    };
  }, []);

  return <div id="scene" className={styles.scene} aria-label={fr.covers.sceneLabel} />;
}
