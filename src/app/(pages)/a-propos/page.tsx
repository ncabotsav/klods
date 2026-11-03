import AboutView, { aboutMetadata } from "@/views/AboutView";

export const metadata = aboutMetadata("fr");

export default function Page() {
  return <AboutView locale="fr" />;
}
