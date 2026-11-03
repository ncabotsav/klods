import SetView, { setMetadata } from "@/views/SetView";
import { setParams } from "@/lib/catalog-server";

/** Une fiche par set du catalogue, construite au build ; un set absent tombe sur la page 404, qui le reconnaît. */
export const dynamicParams = false;
export const generateStaticParams = setParams;

type Props = { params: Promise<{ numero: string }> };

export const generateMetadata = async ({ params }: Props) => setMetadata("en", (await params).numero);

export default async function Page({ params }: Props) {
  return <SetView locale="en" number={(await params).numero} />;
}
