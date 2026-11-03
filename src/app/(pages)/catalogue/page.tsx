import CatalogueView, { catalogueMetadata } from "@/views/CatalogueView";

export const generateMetadata = () => catalogueMetadata("fr");

export default function Page() {
  return <CatalogueView locale="fr" />;
}
