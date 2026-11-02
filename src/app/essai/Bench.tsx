"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepPlayer, { type PlayerStats } from "@/components/player/StepPlayer";
import { SetsIndex, type SetEntry } from "@/lib/catalog-schema";
import { fr } from "@/i18n/fr";
import { asset } from "@/lib/site";
import styles from "./Bench.module.css";

/** Lien vers la notice officielle : le numéro sans le suffixe de version (« 4915-1 » → « 4915 »). */
const officialUrl = (number: string) => `https://www.lego.com/fr-fr/service/building-instructions/${number.replace(/-\d+$/, "")}`;

export default function Bench() {
  const router = useRouter();
  const params = useSearchParams();
  const [sets, setSets] = useState<SetEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [arrows, setArrows] = useState(false);

  useEffect(() => {
    fetch(asset("/data/sets.json"))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => setSets(SetsIndex.parse(json).sets.filter((s) => s.models.some((m) => m.status !== "echec"))))
      .catch(() => setFailed(true));
  }, []);

  const setNumber = params.get("set") ?? sets?.[0]?.number ?? "";
  const current = sets?.find((s) => s.number === setNumber) ?? sets?.[0];
  const models = current?.models.filter((m) => m.status !== "echec") ?? [];
  const model = models.find((m) => m.slug === params.get("modele")) ?? models.find((m) => m.main) ?? models[0];

  const filtered = useMemo(() => {
    if (!sets) return [];
    const q = query.trim().toLowerCase();
    const list = q ? sets.filter((s) => s.number.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) : sets;
    return list.slice(0, 300);
  }, [sets, query]);

  const go = (number: string, slug?: string) => {
    const next = new URLSearchParams({ set: number });
    if (slug) next.set("modele", slug);
    setStats(null);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  if (failed) return <p className={styles.note}>{fr.bench.noData}</p>;
  if (!sets || !current || !model) return null;

  return (
    <div className={styles.bench}>
      <div className={styles.pickers}>
        <label className={styles.field}>
          <span>{fr.bench.search}</span>
          <input id="bench-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="4915" />
        </label>
        <label className={styles.field}>
          <span>{fr.bench.set}</span>
          <select id="bench-set" value={current.number} onChange={(e) => go(e.target.value)}>
            {!filtered.includes(current) && <option value={current.number}>{`${current.number} · ${current.name}`}</option>}
            {filtered.map((s) => (
              <option key={s.number} value={s.number}>{`${s.number} · ${s.name}`}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>{fr.bench.model}</span>
          <select id="bench-model" value={model.slug} onChange={(e) => go(current.number, e.target.value)}>
            {models.map((m) => (
              <option key={m.slug} value={m.slug}>{fr.bench.modelOption(m.name, m.steps)}</option>
            ))}
          </select>
        </label>
      </div>

      <dl className={styles.stats}>
        <div>
          <dt>{fr.bench.status}</dt>
          <dd>{model.status}</dd>
        </div>
        <div>
          <dt>{fr.bench.size}</dt>
          <dd>{(model.bytesGz / 1e6).toFixed(2)} Mo</dd>
        </div>
        <div>
          <dt>{fr.bench.loadTime}</dt>
          <dd>{stats ? `${(stats.loadMs / 1000).toFixed(1)} s` : "…"}</dd>
        </div>
        <div>
          <dt>{fr.bench.frame}</dt>
          <dd>{stats?.frameMs ? `${stats.frameMs.toFixed(1)} ms` : "…"}</dd>
        </div>
        <div>
          <dt>{fr.bench.steps}</dt>
          <dd>{stats?.steps ?? model.steps}</dd>
        </div>
        <div>
          <dt>{fr.bench.parts}</dt>
          <dd>{stats?.parts ?? model.parts}</dd>
        </div>
        <div>
          <dt>{fr.bench.assemblies}</dt>
          <dd>{stats?.assemblies ?? "…"}</dd>
        </div>
        <div>
          <dt>{fr.bench.guided}</dt>
          <dd>{stats ? fr.bench.guidedValue(stats.insertion.guided, stats.insertion.touching, stats.insertion.placed) : "…"}</dd>
        </div>
        <div>
          <dt>{fr.bench.insertionTime}</dt>
          <dd>{stats ? `${stats.insertion.ms} ms` : "…"}</dd>
        </div>
      </dl>
      <label className={styles.check}>
        <input type="checkbox" checked={arrows} onChange={(e) => setArrows(e.target.checked)} />
        {fr.bench.arrows}
      </label>

      <StepPlayer key={model.file} src={model.file} bytes={model.bytes} officialUrl={officialUrl(current.number)} onStats={setStats} arrows={arrows} />
    </div>
  );
}
