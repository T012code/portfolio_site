// Who is visiting, from the edge headers. The domain is proxied by Cloudflare (orange cloud),
// so Vercel's own headers describe Cloudflare's servers, not the visitor; Cloudflare passes the
// real values in its cf-* headers. Requests that skip Cloudflare (the *.vercel.app address) use
// Vercel's. These only feed analytics and a form default, so a forged header costs nothing.

type Headers = { get(name: string): string | null; has(name: string): boolean };

const viaCloudflare = (h: Headers) => h.has("cf-ray");

function decoded(value: string | null) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function visitorIp(h: Headers) {
  if (viaCloudflare(h)) return h.get("cf-connecting-ip")?.trim() ?? "";
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
}

/** Two-letter country code, or "" when unknown (Cloudflare uses XX for unknown and T1 for Tor). */
export function visitorCountry(h: Headers) {
  const code = ((viaCloudflare(h) ? h.get("cf-ipcountry") : h.get("x-vercel-ip-country")) ?? "").toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : "";
}

/** Region and city. Behind Cloudflare these need its "Add visitor location headers" setting. */
export function visitorPlace(h: Headers) {
  return viaCloudflare(h)
    ? { region: decoded(h.get("cf-region")), city: decoded(h.get("cf-ipcity")) }
    : { region: decoded(h.get("x-vercel-ip-country-region")), city: decoded(h.get("x-vercel-ip-city")) };
}
