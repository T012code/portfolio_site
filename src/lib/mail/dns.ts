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

async function lookup(name: string, type: "TXT" | "MX") {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" }, cache: "no-store", signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
  const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
  const wanted = type === "TXT" ? 16 : 15;
  // TXT values arrive quoted and possibly split into 255-byte chunks: join them.
  return (json.Answer ?? [])
    .filter((a) => a.type === wanted)
    .map((a) => (type === "TXT" ? a.data.replace(/"\s*"/g, "").replace(/^"|"$/g, "") : a.data));
}

async function safely(fn: () => Promise<DnsCheck>, fallback: Omit<DnsCheck, "status" | "found" | "note">): Promise<DnsCheck> {
  try {
    return await fn();
  } catch (e) {
    return { ...fallback, status: "error", found: [], note: (e as Error).message };
  }
}

export async function checkDomain(domain: string, dkimSelector: string, reportTo: string): Promise<DnsCheck[]> {
  const d = domain.toLowerCase();

  const mxBase = {
    key: "mx" as const,
    label: "Receiving (MX)",
    host: d,
    expected: "mx.zoho.com (10), mx2.zoho.com (20), mx3.zoho.com (50)",
  };
  const spfBase = { key: "spf" as const, label: "SPF", host: d, expected: "v=spf1 include:zohomail.com ~all" };
  const dkimBase = {
    key: "dkim" as const,
    label: "DKIM",
    host: `${dkimSelector}._domainkey.${d}`,
    expected: "Copy the TXT value from Zoho Mail Admin → Domains → Email configuration → DKIM.",
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
      const zoho = found.some((r) => /zoho/i.test(r));
      return {
        ...mxBase,
        found,
        status: found.length === 0 ? "missing" : zoho ? "ok" : "warn",
        note: found.length === 0 ? "No mail servers: email to this domain bounces." : zoho ? "Mail is delivered to Zoho." : "Mail goes somewhere other than Zoho.",
      };
    }, mxBase),
    safely(async () => {
      const found = (await lookup(d, "TXT")).filter((r) => /^v=spf1/i.test(r));
      const status = found.length === 0 ? "missing" : found.length > 1 ? "warn" : /include:(zoho|zohomail)\./i.test(found[0]) ? "ok" : "warn";
      const note =
        found.length === 0
          ? "Without SPF, receivers can't tell Zoho is allowed to send for you."
          : found.length > 1
            ? "More than one SPF record: receivers treat that as an error. Merge them into one."
            : status === "ok"
              ? "Zoho is authorised to send for this domain."
              : "SPF exists but doesn't include Zoho.";
      return { ...spfBase, found, status, note };
    }, spfBase),
    safely(async () => {
      const found = await lookup(dkimBase.host, "TXT");
      const ok = found.some((r) => /p=[A-Za-z0-9+/]/.test(r));
      return {
        ...dkimBase,
        found,
        status: ok ? "ok" : "missing",
        note: ok ? "Emails are signed, so they can't be altered in transit unnoticed." : `No DKIM key at selector "${dkimSelector}". Check the selector name in Zoho.`,
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
