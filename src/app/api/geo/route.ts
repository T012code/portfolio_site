import type { NextRequest } from "next/server";
import { visitorCountry } from "@/lib/visitor";

// The visitor's country (two letters) from the edge headers, so phone fields can preselect a
// dialling code. Nothing is stored. Without a header the field falls back to the browser's time zone.
export function GET(request: NextRequest) {
  const country = visitorCountry(request.headers);
  return Response.json({ country: country || null }, { headers: { "Cache-Control": "private, no-store" } });
}
