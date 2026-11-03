"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/progress";
import { useT } from "@/i18n/LocaleProvider";
import { buildPageHref } from "@/lib/site";

/**
 * Bouton principal de la fiche : « Commencer le montage », ou « Reprendre à l'étape N »
 * si un montage de ce modèle est en cours dans ce navigateur.
 */
export default function StartButton({ number, model, label }: { number: string; model: string; label?: string }) {
  const fr = useT();
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const p = store[`${number}/${model}`];
  const resumable = !!p && !p.finishedAt && p.step > 0;
  return (
    <a href={buildPageHref(resumable ? `/set/${number}/monter/?etape=${p.step + 1}` : `/set/${number}/monter/`)} className="btn btn-primary">
      {resumable ? fr.set.resume(p.step + 1) : (label ?? fr.set.start)}
    </a>
  );
}
