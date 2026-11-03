import ThemeView, { themeMetadata } from "@/views/ThemeView";
import { themeParams } from "@/lib/catalog-server";

/** Une page par thème de premier niveau, construite au build. */
export const dynamicParams = false;
export const generateStaticParams = () => themeParams("en");

type Props = { params: Promise<{ theme: string }> };

export const generateMetadata = async ({ params }: Props) => themeMetadata("en", (await params).theme);

export default async function Page({ params }: Props) {
  return <ThemeView locale="en" slug={(await params).theme} />;
}
