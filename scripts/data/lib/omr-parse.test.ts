import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOmrSetPage } from "./omr-parse.ts";

// Extrait réduit de https://library.ldraw.org/omr/sets/1689, structure relevée le 2026-11-01
const PAGE = `<html><body><header>Library</header><main class="rounded-lg bg-white p-2"><div wire:id="x">
<div class="flex flex-col space-y-2"> <div class="rounded border-gray-200 text-xl font-bold bg-gray-200 p-2">8094-1 - TECHNIC Control Centre</div>
<div class="rounded border border-gray-200 text-lg font-bold bg-gray-200 p-2">Models</div> <!--[if BLOCK]><![endif]-->
<div class="flex flex-col rounded border"> <div class="font-bold bg-gray-200 p-2"> Robotic Arm </div>
<div class="p-2"> <span class="font-bold pr-2">Author:</span>Takeshi Takahashi [RainbowDolphin] </div>
<div class="grid grid-cols-3 p-2"> <div> <span class="font-bold">Missing Parts</span><br> No </div> <div> <span class="font-bold">Missing Patterns</span><br> Yes </div> <div> <span class="font-bold">Missing Stickers</span><br> No </div> </div>
<div class="flex flex-row space-x-2"> <button type="button"><svg><path d="M0"/></svg> 3D View </button>
<a href="https://library.ldraw.org/media/omr_models/1859/8094-1_Robotic-Arm.mpd?v=1770148074">Download</a> </div> </div>
<div class="flex flex-col rounded border"> <div class="font-bold bg-gray-200 p-2"> Plotter </div>
<div class="p-2"> <span class="font-bold pr-2">Author:</span>Takeshi Takahashi [RainbowDolphin] </div>
<div class="grid grid-cols-3 p-2"> <div> <span class="font-bold">Missing Parts</span><br> Yes </div> <div> <span class="font-bold">Missing Patterns</span><br> No </div> <div> <span class="font-bold">Missing Stickers</span><br> No </div> </div>
<div class="flex flex-row space-x-2"> <a href="https://library.ldraw.org/media/omr_models/1860/8094-1_Plotter.mpd?v=1770148089">Download</a> </div> </div>
</div></div></main></body></html>`;

test("lit le numéro, le titre et chaque modèle d'une fiche OMR", () => {
  const set = parseOmrSetPage(PAGE, 1689);
  assert.equal(set.number, "8094-1");
  assert.equal(set.title, "TECHNIC Control Centre");
  assert.equal(set.models.length, 2);
  assert.deepEqual(set.models[0], {
    fileId: 1859,
    name: "Robotic Arm",
    author: "Takeshi Takahashi [RainbowDolphin]",
    fileName: "8094-1_Robotic-Arm.mpd",
    url: "https://library.ldraw.org/media/omr_models/1859/8094-1_Robotic-Arm.mpd?v=1770148074",
    version: "1770148074",
    missingParts: false,
    missingPatterns: true,
    missingStickers: false,
  });
  assert.equal(set.models[1].name, "Plotter");
  assert.equal(set.models[1].missingParts, true);
});
