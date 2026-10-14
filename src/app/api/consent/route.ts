import { after, type NextRequest } from "next/server";
import { isBot } from "@/lib/analytics/agent";
import { SITE_URL } from "@/lib/env";
import { mailGate } from "@/lib/mail/secret";
import { createPublicClient } from "@/lib/supabase/public";

// The consent log (NDPA GAID 2025, Art. 17(6)): which choice was made, on which version of the
// cookie notice and when, keyed by the random id the browser keeps with its choice. No IP address,
// location or device details are stored with it.

const noContent = () => new Response(null, { status: 204 });

const bareHost = (url: string) => new URL(url).hostname.replace(/^www\./, "");

function fromThisSite(origin: string, request: NextRequest) {
  try {
    return origin === request.nextUrl.origin || bareHost(origin) === bareHost(SITE_URL);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (isBot(request.headers.get("user-agent") ?? "")) return noContent();
  const origin = request.headers.get("origin");
  if (origin && !fromThisSite(origin, request)) return noContent();

  const raw = await request.text();
  if (raw.length > 500) return noContent();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return noContent();
  }

  const id = typeof body.id === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.id) ? body.id : null;
  const version = typeof body.version === "number" && Number.isInteger(body.version) ? body.version : null;
  if (!id || version === null || typeof body.analytics !== "boolean") return noContent();
  const analytics = body.analytics;

  const gate = mailGate();
  if (!gate) return noContent();

  after(async () => {
    const { error } = await createPublicClient().rpc("record_consent", {
      p_gate: gate,
      p_consent_id: id,
      p_analytics: analytics,
      p_version: version,
    });
    if (error) console.error("consent: record failed", error.message);
  });

  return noContent();
}
