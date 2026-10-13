import { after, type NextRequest } from "next/server";
import { browser, device, isBot, os } from "@/lib/analytics/agent";
import { mailGate, visitorId } from "@/lib/mail/secret";
import { createPublicClient } from "@/lib/supabase/public";
import { SITE_URL } from "@/lib/env";

// Page-view beacon from the site. Location comes from Vercel's edge headers; the visitor id is
// an HMAC of IP and user agent, so no cookie is set. Bots and the signed-in admin are skipped.

const noContent = () => new Response(null, { status: 204 });

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "";
}

function header(request: NextRequest, name: string) {
  const value = request.headers.get(name);
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

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

  const path = typeof body.path === "string" ? body.path : "";
  if (!path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return noContent();

  const ip = clientIp(request);
  const gate = mailGate();
  const visitor = visitorId(ip, ua);
  if (!gate || !visitor) return noContent();

  const session = typeof body.session === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(body.session) ? body.session : null;

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
      p_country: (request.headers.get("x-vercel-ip-country") ?? "").toUpperCase(),
      p_region: header(request, "x-vercel-ip-country-region"),
      p_city: header(request, "x-vercel-ip-city"),
      p_device: device(ua),
      p_browser: browser(ua),
      p_os: os(ua),
    });
    if (error) console.error("analytics: record failed", error.message);
  });

  return noContent();
}
