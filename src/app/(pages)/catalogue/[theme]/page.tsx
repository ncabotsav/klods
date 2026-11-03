import ThemeView, { themeMetadata } from "@/views/ThemeView";
import { themeParams } from "@/lib/catalog-server";

/** Une page par thème de premier niveau, construite au build. */
export const dynamicParams = false;
export const generateStaticParams = () => themeParams("fr");

type Props = { params: Promise<{ theme: string }> };

export const generateMetadata = async ({ params }: Props) => themeMetadata("fr", (await params).theme);

export default async function Page({ params }: Props) {
  return <ThemeView locale="fr" slug={(await params).theme} />;
}
