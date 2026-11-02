import { searchEntries } from "@/lib/catalog-server";

/** Index de la recherche, écrit en fichier statique au build (une entrée courte par set). */
export const dynamic = "force-static";

export function GET() {
  return Response.json(searchEntries());
}
