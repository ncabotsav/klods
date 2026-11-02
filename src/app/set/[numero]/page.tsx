import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./SetPage.module.css";
import SetCover from "@/components/catalog/SetCover";
import { SetGrid } from "@/components/catalog/SetCard";
import StartButton from "@/components/catalog/StartButton";
import { cardPath, findSet, hasCard, hasCover, relatedSets, searchEntries, setParams } from "@/lib/catalog-server";
import { defaultModel, estimateMinutes, officialManualUrl, playableModels, slugify } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";
import { fr } from "@/i18n/fr";

/** Une fiche par set du catalogue, construite au build ; un set absent tombe sur la page 404, qui le reconnaît. */
export const dynamicParams = false;
export const generateStaticParams = setParams;

type Props = { params: Promise<{ numero: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const set = findSet((await params).numero);
  if (!set) return {};
  const m = defaultModel(set);
  const title = `${set.name} (${set.number})`;
  const description = fr.set.description(set.number, set.name, m.steps, m.parts);
  const images = hasCard(set.number) ? [{ url: `/${cardPath(set.number)}`, width: 1200, height: 630, alt: set.name }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/set/${set.number}/` },
    openGraph: { type: "website", title, description, url: `/set/${set.number}/`, images },
    twitter: { card: "summary_large_image", title, description, images: images?.map((i) => i.url) },
  };
}

export default async function SetPage({ params }: Props) {
  const set = findSet((await params).numero);
  if (!set) notFound();
  const models = playableModels(set);
  const main = defaultModel(set);
  const withSteps = main.status !== "sans-etapes";
  const incomplete = main.status === "incomplet";
  const minutes = estimateMinutes(main);
  const official = officialManualUrl(set.number);
  const related = new Set(relatedSets(set, 4).map((s) => s.number));
  const relatedEntries = searchEntries().filter((e) => related.has(e.n));
  const authors = [...new Set(models.map((m) => m.author))];

  // données structurées : une notice de montage (HowTo), avec sa durée et l'auteur du modèle 3D
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: fr.set.howToName(set.number, set.name),
    description: fr.set.description(set.number, set.name, main.steps, main.parts),
    url: `${SITE_URL}/set/${set.number}/`,
    inLanguage: "fr",
    ...(hasCover(set.number) ? { image: `${SITE_URL}/${cardPath(set.number)}` } : {}),
    ...(withSteps ? { totalTime: `PT${minutes}M`, step: Array.from({ length: Math.min(main.steps, 3) }, (_, i) => ({ "@type": "HowToStep", position: i + 1, name: fr.set.howToStep(i + 1), url: `${SITE_URL}/set/${set.number}/monter/?etape=${i + 1}` })) } : {}),
    isBasedOn: { "@type": "CreativeWork", name: fr.set.sourceModel(set.number, set.name), author: authors.map((name) => ({ "@type": "Person", name })), license: "https://creativecommons.org/licenses/by/2.0/" },
  };

  return (
    <div className={`wrap ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label={fr.set.breadcrumb} className="eyebrow">
        <Link href="/catalogue/">{fr.catalogue.title}</Link>
        {set.theme && (
          <>
            {" › "}
            <Link href={`/catalogue/${slugify(set.theme)}/`}>{set.theme}</Link>
          </>
        )}
      </nav>

      <div className={styles.hero}>
        <SetCover number={set.number} hasCover={hasCover(set.number)} large eager />
        <div className={styles.text}>
          <h1 className={styles.title}>{set.name}</h1>
          <p className={styles.meta}>{[set.number, set.themePath.join(" › ") || set.theme, set.year].filter(Boolean).join(" · ")}</p>

          <dl className={styles.facts}>
            <div>
              <dt>{fr.build.cover.pieces}</dt>
              <dd>{main.parts}</dd>
            </div>
            {withSteps && (
              <>
                <div>
                  <dt>{fr.build.cover.steps}</dt>
                  <dd>{main.steps}</dd>
                </div>
                <div>
                  <dt>{fr.build.cover.time}</dt>
                  <dd>{fr.build.cover.minutes(minutes)}</dd>
                </div>
              </>
            )}
          </dl>

          {withSteps ? (
            <div className={styles.actions}>
              <StartButton number={set.number} model={main.slug} />
              <a className="btn" href={official} target="_blank" rel="noopener">
                {fr.set.official}
              </a>
            </div>
          ) : (
            <div className={styles.notice}>
              <h2 className={styles.noticeTitle}>{fr.set.noStepsTitle}</h2>
              <p>{fr.set.noStepsBody}</p>
              <div className={styles.actions}>
                <a className="btn btn-primary" href={official} target="_blank" rel="noopener">
                  {fr.set.officialManual}
                </a>
                <Link className="btn" href={`/set/${set.number}/monter/`}>
                  {fr.set.seeModel}
                </Link>
              </div>
            </div>
          )}

          {incomplete && <p className={styles.warning}>{fr.build.cover.incomplete}</p>}
          {withSteps && <p className={styles.note}>{fr.build.cover.generatedNote}</p>}
        </div>
      </div>

      {models.length > 1 && (
        <section className={styles.section} aria-labelledby="modeles">
          <h2 id="modeles" className={styles.sectionTitle}>
            {fr.set.models}
          </h2>
          <ul className={styles.models}>
            {models.map((m) => (
              <li key={m.slug}>
                <span className={styles.modelName}>{m.main ? fr.build.cover.mainModel : m.name}</span>
                <span className={styles.modelMeta}>{fr.set.modelSteps(m.steps, m.parts)}</span>
                <Link href={`/set/${set.number}/monter/?modele=${encodeURIComponent(m.slug)}`} aria-label={`${fr.set.build} : ${m.main ? fr.build.cover.mainModel : m.name}`}>
                  {fr.set.build}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section} aria-labelledby="credits">
        <h2 id="credits" className={styles.sectionTitle}>
          {fr.set.credits}
        </h2>
        <ul className={styles.credits}>
          {models.map((m) => (
            <li key={m.slug}>{fr.set.authorLine(m.main ? fr.build.cover.mainModel : m.name, m.author)}</li>
          ))}
          <li>{fr.set.dataLine}</li>
          <li>
            <a href={`https://library.ldraw.org/omr/sets/${set.omrId}`} target="_blank" rel="noopener">
              {fr.set.contribute}
            </a>
          </li>
        </ul>
        {withSteps && (
          <p>
            <Link href={`/set/${set.number}/imprimer/`}>{fr.set.print}</Link>
          </p>
        )}
      </section>

      {relatedEntries.length > 0 && set.theme && (
        <section className={styles.section} aria-labelledby="autres">
          <h2 id="autres" className={styles.sectionTitle}>
            {fr.set.more(set.theme)}
          </h2>
          <SetGrid entries={relatedEntries} />
        </section>
      )}
    </div>
  );
}
