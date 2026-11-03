import TextView, { textMetadata } from "@/views/TextView";

export const metadata = textMetadata("legal", "fr");

export default function Page() {
  return <TextView page="legal" locale="fr" />;
}
