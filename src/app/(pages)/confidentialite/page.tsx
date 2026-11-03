import TextView, { textMetadata } from "@/views/TextView";

export const metadata = textMetadata("privacy", "fr");

export default function Page() {
  return <TextView page="privacy" locale="fr" />;
}
