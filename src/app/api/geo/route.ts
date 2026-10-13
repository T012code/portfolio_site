import type { NextRequest } from "next/server";

// The visitor's country from Vercel's edge (two letters), so phone fields can preselect a dialling code.
// Nothing is stored. Off Vercel the header is missing and the field falls back to the browser's time zone.
export function GET(request: NextRequest) {
  const country = request.headers.get("x-vercel-ip-country");
  return Response.json(
    { country: country && /^[A-Z]{2}$/.test(country) ? country : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
