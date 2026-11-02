import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PrintApp from "@/components/build/PrintApp";
import { findSet, setParams } from "@/lib/catalog-server";
import { fr } from "@/i18n/fr";

export const dynamicParams = false;
export const generateStaticParams = setParams;

type Props = { params: Promise<{ numero: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const set = findSet((await params).numero);
  return set ? { title: `${fr.build.print.title} : ${set.name} (${set.number})` } : {};
}

export default async function ImprimerPage({ params }: Props) {
  const set = findSet((await params).numero);
  if (!set) notFound();
  return (
    <Suspense fallback={null}>
      <PrintApp set={set} />
    </Suspense>
  );
}
