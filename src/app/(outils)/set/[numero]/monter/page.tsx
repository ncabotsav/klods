import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BuildApp from "@/components/build/BuildApp";
import { findSet, hasCover, relatedSets, setParams } from "@/lib/catalog-server";
import { fr } from "@/i18n/fr";

/** Une page par set du catalogue, construite au build ; aucune autre adresse n'existe. */
export const dynamicParams = false;
export const generateStaticParams = setParams;

type Props = { params: Promise<{ numero: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const set = findSet((await params).numero);
  return set ? { title: `${set.name} (${set.number})`, description: fr.site.description, robots: { index: false, follow: true }, alternates: { canonical: `/set/${set.number}/` } } : {};
}

export default async function MonterPage({ params }: Props) {
  const set = findSet((await params).numero);
  if (!set) notFound();
  return (
    <Suspense fallback={null}>
      <BuildApp set={set} related={relatedSets(set)} hasCover={hasCover(set.number)} />
    </Suspense>
  );
}
