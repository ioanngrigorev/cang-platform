import { NextResponse, type NextRequest } from "next/server";
import { search } from "@/modules/search";

export const dynamic = "force-dynamic";

/** GET /api/search/suggest?q=back → typeahead suggestions (categories, products, suppliers). */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ suggestions: [] }, { headers: { "Cache-Control": "public, max-age=60" } });
  try {
    const suggestions = await search().suggest(q, 8);
    return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("[api/search/suggest]", err);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
