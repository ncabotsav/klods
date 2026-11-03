"use client";

import { useEffect, useMemo, useState } from "react";
import type { Object3D } from "three";
import styles from "./BuildApp.module.css";
import RealSize from "./RealSize";
import type { LoadedModel } from "@/components/player/useModel";
import type { PartGroup } from "@/engine/instructions";
import { missingPartsUrl } from "@/lib/catalog";
import { useLocale } from "@/i18n/LocaleProvider";

type Props = {
  loaded: LoadedModel;
  missing: string[];
  onToggleMissing: (key: string) => void;
  onDone: () => void;
};

/** Toutes les pièces du modèle (copies des sous-ensembles comprises), une seule fois chacune. */
function allParts(loaded: LoadedModel): Object3D[] {
  const { isPart } = loaded.engine.steps;
  const out: Object3D[] = [];
  loaded.model.traverse((o) => {
    if (isPart(o) && !(o.parent && isPart(o.parent))) out.push(o);
  });
  return out;
}

/** Inventaire : chaque pièce dessinée avec son nombre, rangée par couleur ; on peut marquer une pièce manquante. */
export default function PartsPhase({ loaded, missing, onToggleMissing, onDone }: Props) {
  const { t: fr, locale } = useLocale();
  const groups = useMemo(() => {
    const list = loaded.engine.instructions.groupParts(allParts(loaded), loaded.info, locale);
    return list.sort((a, b) => a.colourName.localeCompare(b.colourName) || a.name.full.localeCompare(b.name.full));
  }, [loaded, locale]);
  const total = groups.reduce((n, g) => n + g.count, 0);

  // miniatures dessinées par paquets, pour ne pas figer la page sur les gros sets
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    let i = 0;
    const batch = () => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const g of groups.slice(i, i + 24)) next[g.key] = loaded.engine.thumbs.partThumbnail(`${loaded.key}|${g.key}`, g.sample);
      i += 24;
      setThumbs((t) => ({ ...t, ...next }));
      if (i < groups.length) window.setTimeout(batch, 16);
    };
    const first = window.setTimeout(batch, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
    };
  }, [groups, loaded]);

  const [sizing, setSizing] = useState<PartGroup | null>(null);
  const missingGroups = groups.filter((g) => missing.includes(g.key));

  return (
    <section className={styles.parts} aria-labelledby="parts-title">
      <div className={styles.partsHead}>
        <h1 id="parts-title" className={styles.sectionTitle}>
          {fr.build.parts.title}
        </h1>
        <p className={styles.muted}>{fr.build.parts.lead(total, groups.length)}</p>
      </div>

      <ul className={styles.inventory}>
        {groups.map((g) => {
          const isMissing = missing.includes(g.key);
          return (
            <li key={g.key} className={isMissing ? styles.isMissing : undefined}>
              <span className={styles.thumb}>
                {/* eslint-disable-next-line @next/next/no-img-element -- image générée dans le navigateur */}
                {thumbs[g.key] ? <img src={thumbs[g.key]} alt="" width={64} height={64} /> : null}
              </span>
              <span className={styles.qty}>{g.count}×</span>
              <span className={styles.partName}>
                <span>{g.name.full}</span>
                <span className={styles.partMeta}>
                  <span className={styles.swatch} style={{ background: g.hex ?? "transparent" }} aria-hidden="true" />
                  {loaded.engine.instructions.colourLabel(g.colourName, g.gender, false, locale)} · {fr.build.parts.number} {g.number}
                </span>
              </span>
              <span className={styles.partActions}>
                <button type="button" className={styles.linkBtn} aria-label={fr.build.parts.realSizeOf(g.name.full)} onClick={() => setSizing(g)}>
                  {fr.build.parts.realSize}
                </button>
                <button type="button" className={styles.linkBtn} aria-pressed={isMissing} aria-label={fr.build.parts.missingOf(g.name.full)} onClick={() => onToggleMissing(g.key)}>
                  {isMissing ? fr.build.parts.missingOn : fr.build.parts.missing}
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className={styles.partsFoot}>
        {missingGroups.length > 0 ? (
          <div className={styles.missingBox}>
            <h2 className={styles.subTitle}>{fr.build.parts.missingTitle}</h2>
            <p className={styles.muted}>{fr.build.parts.missingLead}</p>
            <ul>
              {missingGroups.map((g) => (
                <li key={g.key}>
                  {g.count}× {g.name.full} ({loaded.engine.instructions.colourLabel(g.colourName, g.gender, false, locale)}), {fr.build.parts.number} {g.number}
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              <a className="btn" href={missingPartsUrl(locale)} target="_blank" rel="noopener">
                {fr.build.parts.missingLink}
              </a>
              <button type="button" className="btn btn-primary" onClick={onDone}>
                {fr.build.parts.continueAnyway}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onDone}>
            {fr.build.parts.allHere}
          </button>
        )}
      </div>

      {sizing && <RealSize group={sizing} loaded={loaded} onClose={() => setSizing(null)} />}
    </section>
  );
}
