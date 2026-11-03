import CatalogueView, { catalogueMetadata } from "@/views/CatalogueView";

export const generateMetadata = () => catalogueMetadata("en");

export default function Page() {
  return <CatalogueView locale="en" />;
}
