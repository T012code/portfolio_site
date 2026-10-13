import { after, type NextRequest } from "next/server";
import { loadWhatsAppRuntime } from "@/lib/whatsapp/send";
import { processWebhook, validSignature } from "@/lib/whatsapp/webhook";

// Meta's webhook for the WhatsApp Business number. Set the callback URL in the Meta app to
// https://www.layothedeveloper.com/api/whatsapp with the verify token from Admin → WhatsApp.

/** Subscription check: Meta sends the verify token and expects the challenge back. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const loaded = await loadWhatsAppRuntime();
  if (
    loaded.ok &&
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === loaded.runtime.settings.verify_token
  ) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > 512_000) return new Response("Too large", { status: 413 });

  const loaded = await loadWhatsAppRuntime();
  if (!loaded.ok || !loaded.runtime.appSecret) return new Response("Not configured", { status: 503 });
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"), loaded.runtime.appSecret)) {
    return new Response("Bad signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  // Answer straight away (Meta retries slow responses); the work happens after.
  after(() => processWebhook(loaded.runtime, payload as Parameters<typeof processWebhook>[1]));
  return new Response("OK", { status: 200 });
}
