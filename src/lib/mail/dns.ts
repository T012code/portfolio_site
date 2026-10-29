import "server-only";

// Deliverability checks over DNS-over-HTTPS (works on any host, no UDP needed).

export type DnsCheck = {
  key: "mx" | "spf" | "dkim" | "dmarc";
  label: string;
  host: string;
  status: "ok" | "warn" | "missing" | "error";
  found: string[];
  expected: string;
  note: string;
};

async function lookup(name: string, type: "TXT" | "MX" | "A", timeout = 6000) {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" }, cache: "no-store", signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
  const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
  const wanted = { TXT: 16, MX: 15, A: 1 }[type];
  // TXT values arrive quoted and possibly split into 255-byte chunks: join them.
  return (json.Answer ?? [])
    .filter((a) => a.type === wanted)
    .map((a) => (type === "TXT" ? a.data.replace(/"\s*"/g, "").replace(/^"|"$/g, "") : a.data));
}

/**
 * Whether a domain can receive email: it has an MX record, or at least an address (A) record.
 * When DNS itself can't be reached, the answer is yes, so a lookup outage never blocks a visitor.
 */
export async function domainAcceptsMail(domain: string): Promise<boolean> {
  try {
    if ((await lookup(domain, "MX", 3000)).some((mx) => !/^0\s+\.?$/.test(mx.trim()))) return true;
    return (await lookup(domain, "A", 3000)).length > 0;
  } catch {
    return true;
  }
}

async function safely(fn: () => Promise<DnsCheck>, fallback: Omit<DnsCheck, "status" | "found" | "note">): Promise<DnsCheck> {
  try {
    return await fn();
  } catch (e) {
    return { ...fallback, status: "error", found: [], note: (e as Error).message };
  }
}

export type MailProvider = "zoho" | "google" | "resend" | "other";

export function providerFromHost(host: string): MailProvider {
  if (/zoho/i.test(host)) return "zoho";
  if (/gmail|google/i.test(host)) return "google";
  if (/resend/i.test(host)) return "resend";
  return "other";
}

const PROVIDERS = {
  zoho: {
    name: "Zoho",
    mx: "mx.zoho.com (10), mx2.zoho.com (20), mx3.zoho.com (50)",
    mxPattern: /zoho/i,
    spf: "v=spf1 include:zohomail.com ~all",
    spfPattern: /include:(zoho|zohomail)\./i,
    spfHost: "",
    sendOnly: false,
    dkim: "Copy the TXT value from Zoho Mail Admin → Domains → Email configuration → DKIM.",
  },
  google: {
    name: "Google",
    mx: "smtp.google.com (1)",
    mxPattern: /google|googlemail/i,
    spf: "v=spf1 include:_spf.google.com ~all",
    spfPattern: /include:_spf\.google\.com/i,
    spfHost: "",
    sendOnly: false,
    dkim: "Generate the key in Google Admin → Apps → Google Workspace → Gmail → Authenticate email, then add it here.",
  },
  resend: {
    name: "Resend",
    mx: "Any inbox service: Resend only sends. Cloudflare Email Routing, Zoho or Google all work.",
    mxPattern: /./,
    spf: "The TXT record Resend gives you on the send subdomain (v=spf1 …).",
    spfPattern: /^v=spf1/i,
    spfHost: "send",
    sendOnly: true,
    dkim: "Copy the resend._domainkey TXT value from Resend → Domains.",
  },
  other: {
    name: "your email provider",
    mx: "The MX records your email provider gives you.",
    mxPattern: /./,
    spf: "v=spf1 include:<your provider's SPF domain> ~all",
    spfPattern: /include:/i,
    spfHost: "",
    sendOnly: false,
    dkim: "Copy the DKIM TXT value from your email provider's admin console.",
  },
} as const;

export async function checkDomain(
  domain: string,
  dkimSelector: string,
  reportTo: string,
  provider: MailProvider = "zoho",
): Promise<DnsCheck[]> {
  const d = domain.toLowerCase();
  const p = PROVIDERS[provider];

  const mxBase = {
    key: "mx" as const,
    label: "Receiving (MX)",
    host: d,
    expected: p.mx,
  };
  // Resend publishes its SPF on a subdomain (send.<domain>), where its bounces return.
  const spfBase = { key: "spf" as const, label: "SPF", host: p.spfHost ? `${p.spfHost}.${d}` : d, expected: p.spf };
  const dkimBase = {
    key: "dkim" as const,
    label: "DKIM",
    host: `${dkimSelector}._domainkey.${d}`,
    expected: p.dkim,
  };
  const dmarcBase = {
    key: "dmarc" as const,
    label: "DMARC",
    host: `_dmarc.${d}`,
    expected: `v=DMARC1; p=quarantine; rua=mailto:${reportTo}`,
  };

  return Promise.all([
    safely(async () => {
      const found = await lookup(d, "MX");
      const match = found.some((r) => p.mxPattern.test(r));
      return {
        ...mxBase,
        found,
        status: found.length === 0 ? "missing" : match ? "ok" : "warn",
        note:
          found.length === 0
            ? "No mail servers: email to this domain bounces."
            : p.sendOnly
              ? `Incoming mail has somewhere to go. ${p.name} only sends, so any inbox service is fine.`
              : match
                ? `Mail is delivered to ${p.name}.`
                : `Mail goes somewhere other than ${p.name}.`,
      };
    }, mxBase),
    safely(async () => {
      const found = (await lookup(spfBase.host, "TXT")).filter((r) => /^v=spf1/i.test(r));
      const status = found.length === 0 ? "missing" : found.length > 1 ? "warn" : p.spfPattern.test(found[0]) ? "ok" : "warn";
      const note =
        found.length === 0
          ? `Without SPF, receivers can't tell ${p.name} is allowed to send for you.`
          : found.length > 1
            ? "More than one SPF record: receivers treat that as an error. Merge them into one."
            : status === "ok"
              ? `${p.name} is authorised to send for this domain.`
              : `SPF exists but doesn't include ${p.name}.`;
      return { ...spfBase, found, status, note };
    }, spfBase),
    safely(async () => {
      const found = await lookup(dkimBase.host, "TXT");
      const ok = found.some((r) => /p=[A-Za-z0-9+/]/.test(r));
      return {
        ...dkimBase,
        found,
        status: ok ? "ok" : "missing",
        note: ok ? "Emails are signed, so they can't be altered in transit unnoticed." : `No DKIM key at selector "${dkimSelector}". Check the selector name in ${p.name}.`,
      };
    }, dkimBase),
    safely(async () => {
      const found = (await lookup(dmarcBase.host, "TXT")).filter((r) => /^v=DMARC1/i.test(r));
      const policy = found[0]?.match(/;\s*p=(\w+)/i)?.[1]?.toLowerCase();
      const status = found.length === 0 ? "missing" : policy === "none" ? "warn" : "ok";
      const note =
        found.length === 0
          ? "Gmail and Yahoo expect a DMARC record from senders."
          : policy === "none"
            ? "Monitoring only. Once reports look clean, move to p=quarantine."
            : `Policy: ${policy ?? "unknown"}.`;
      return { ...dmarcBase, found, status, note };
    }, dmarcBase),
  ]);
}
