import { searchEntries } from "@/lib/catalog-server";

/** Index de la recherche en anglais : mêmes sets, thèmes sous leur nom anglais. */
export const dynamic = "force-static";

export function GET() {
  return Response.json(searchEntries("en"));
}
