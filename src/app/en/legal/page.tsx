import TextView, { textMetadata } from "@/views/TextView";

export const metadata = textMetadata("legal", "en");

export default function Page() {
  return <TextView page="legal" locale="en" />;
}
