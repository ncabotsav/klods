"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./BuildApp.module.css";
import type { LoadedModel } from "@/components/player/useModel";
import type { PartGroup } from "@/engine/instructions";
import { useT } from "@/i18n/LocaleProvider";

/** Une carte bancaire mesure 85,6 mm de large (norme ISO/IEC 7810 ID-1). */
const CARD_MM = 85.6;
const CARD_RATIO = 53.98 / 85.6;
const KEY = "klods:px-par-mm";
/** 96 pixels CSS par pouce : la valeur théorique, souvent fausse sur téléphone, d'où le réglage. */
const DEFAULT_PX_PER_MM = 96 / 25.4;

function readScale(): number {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return v > 1 && v < 20 ? v : DEFAULT_PX_PER_MM;
  } catch {
    return DEFAULT_PX_PER_MM;
  }
}

/** Fenêtre « taille réelle » : la pièce vue de dessus à l'échelle 1, et le réglage avec une carte bancaire. */
export default function RealSize({ group, loaded, onClose }: { group: PartGroup; loaded: LoadedModel; onClose: () => void }) {
  const fr = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pxPerMm, setPxPerMm] = useState(readScale);
  const [calibrating, setCalibrating] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  // l'image se redessine quand l'échelle change ; le dessin est rapide (une pièce, vue de dessus)
  const image = useMemo(() => loaded.engine.thumbs.partTopView(group.sample, pxPerMm), [group, loaded, pxPerMm]);

  const saveScale = (v: number) => {
    setPxPerMm(v);
    try {
      window.localStorage.setItem(KEY, String(v));
    } catch {
      /* stockage bloqué : le réglage vaut pour cette visite */
    }
  };

  const cardWidth = Math.round(CARD_MM * pxPerMm);

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose} aria-labelledby="realsize-title">
      <h2 id="realsize-title" className={styles.subTitle}>
        {fr.build.realSize.title} : {group.name.full}
      </h2>
      {calibrating ? (
        <>
          <p className={styles.muted}>{fr.build.realSize.calibrateLead}</p>
          <div className={styles.card} style={{ width: cardWidth, height: Math.round(cardWidth * CARD_RATIO) }}>
            {fr.build.realSize.card}
          </div>
          <label className={styles.field}>
            <span>{fr.build.realSize.scale}</span>
            <input
              id="realsize-scale"
              type="range"
              min={150}
              max={600}
              value={cardWidth}
              onChange={(e) => saveScale(Number(e.target.value) / CARD_MM)}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={() => setCalibrating(false)}>
            {fr.build.realSize.done}
          </button>
        </>
      ) : (
        <>
          <p className={styles.muted}>{fr.build.realSize.lead}</p>
          <div className={styles.realSize}>
            {image.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- image générée dans le navigateur
              <img src={image.url} alt={group.name.full} style={{ width: image.width, height: image.height }} />
            ) : (
              <p className={styles.muted}>{fr.player.noWebgl}</p>
            )}
          </div>
          <div className={styles.actions}>
            <button type="button" className="btn" onClick={() => setCalibrating(true)}>
              {fr.build.realSize.calibrate}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => dialogRef.current?.close()}>
              {fr.build.realSize.close}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
