// Cal.com webhook: marks an enquiry as booked when its call is scheduled.
// Deploy with verify_jwt = false; requests are authenticated by Cal's HMAC signature.
import { createClient } from "npm:@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("CAL_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

function secretKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // fall through to the legacy key
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sign(body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type CalPayload = {
  triggerEvent?: string;
  payload?: {
    uid?: string;
    startTime?: string;
    metadata?: Record<string, unknown>;
    attendees?: { email?: string }[];
    responses?: { email?: { value?: string } };
  };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!WEBHOOK_SECRET) return new Response("Webhook secret not configured", { status: 503 });

  const raw = await req.text();
  const signature = (req.headers.get("x-cal-signature-256") ?? "").toLowerCase();
  if (!safeEqual(await sign(raw), signature)) return new Response("Invalid signature", { status: 401 });

  let event: CalPayload;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const trigger = event.triggerEvent ?? "";
  if (trigger === "PING") return Response.json({ ok: true });
  const booking = event.payload ?? {};
  const db = createClient(SUPABASE_URL, secretKey(), { auth: { persistSession: false } });

  // Find the enquiry: by the id passed through the embed, else by the attendee's recent enquiry.
  let enquiryId = typeof booking.metadata?.enquiryId === "string" ? booking.metadata.enquiryId : "";
  if (!UUID.test(enquiryId)) {
    enquiryId = "";
    const email = (booking.attendees?.[0]?.email ?? booking.responses?.email?.value ?? "").toLowerCase();
    if (email) {
      const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
      const { data } = await db
        .from("enquiries")
        .select("id")
        .eq("email", email)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);
      enquiryId = data?.[0]?.id ?? "";
    }
  }
  if (!enquiryId) return Response.json({ ok: true, matched: false });

  if (trigger === "BOOKING_CREATED" || trigger === "BOOKING_RESCHEDULED") {
    const { error } = await db
      .from("enquiries")
      .update({ status: "booked", booking_uid: booking.uid ?? null, booking_start: booking.startTime ?? null })
      .eq("id", enquiryId);
    if (error) return new Response(error.message, { status: 500 });
  } else if (trigger === "BOOKING_CANCELLED") {
    // Only clear the booking we recorded; a stale or duplicate cancellation is ignored.
    if (!booking.uid) return Response.json({ ok: true, matched: false });
    const { error } = await db
      .from("enquiries")
      .update({ status: "new", booking_uid: null, booking_start: null })
      .eq("id", enquiryId)
      .eq("status", "booked")
      .eq("booking_uid", booking.uid);
    if (error) return new Response(error.message, { status: 500 });
  }

  return Response.json({ ok: true, matched: true });
});
