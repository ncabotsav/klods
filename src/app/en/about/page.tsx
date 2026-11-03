import AboutView, { aboutMetadata } from "@/views/AboutView";

export const metadata = aboutMetadata("en");

export default function Page() {
  return <AboutView locale="en" />;
}
