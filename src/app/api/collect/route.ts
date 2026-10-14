import { after, type NextRequest } from "next/server";
import { browser, device, isBot, os } from "@/lib/analytics/agent";
import { mailGate, visitorId } from "@/lib/mail/secret";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE_URL } from "@/lib/env";
import { visitorCountry, visitorIp, visitorPlace } from "@/lib/visitor";

// Page-view beacon from the site, sent only with the visitor's consent. Location comes from the edge
// headers (lib/visitor); the visitor id is an HMAC of IP and user agent, so no cookie is set. Bots and
// the signed-in admin are skipped.

const noContent = () => new Response(null, { status: 204 });

function hostOf(url: unknown) {
  if (typeof url !== "string" || url === "") return "";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const own = new URL(SITE_URL).hostname.replace(/^www\./, "");
    return host === own ? "" : host;
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return noContent();
  // The admin's own browsing would skew the numbers.
  if (request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"))) return noContent();
  // Only accept beacons sent from this site.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin && hostOf(origin) !== "") return noContent();

  const raw = await request.text();
  if (raw.length > 4_000) return noContent();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return noContent();
  }

  // Sent only after the visitor accepts visit counting; this also turns away pages still open from
  // before the cookie notice existed.
  if (body.consent !== true) return noContent();

  const path = typeof body.path === "string" ? body.path : "";
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return noContent();

  const ip = visitorIp(request.headers);
  const gate = mailGate();
  const visitor = visitorId(ip, ua);
  if (!gate || !visitor) return noContent();

  const session = typeof body.session === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(body.session) ? body.session : null;

  const place = visitorPlace(request.headers);

  // Record after responding, so the beacon never waits on the database.
  after(async () => {
    const { error } = await createPublicClient().rpc("record_page_view", {
      p_gate: gate,
      p_path: path.slice(0, 512),
      p_title: typeof body.title === "string" ? body.title.slice(0, 300) : "",
      p_referrer_host: hostOf(body.referrer),
      p_utm_source: typeof body.utm === "string" ? body.utm.slice(0, 100) : "",
      p_visitor_id: visitor,
      p_session_id: session,
      p_ip: ip,
      p_country: visitorCountry(request.headers),
      p_region: place.region,
      p_city: place.city,
      p_device: device(ua),
      p_browser: browser(ua),
      p_os: os(ua),
    });
    if (error) console.error("analytics: record failed", error.message);
  });

  return noContent();
}
