import "server-only";
import crypto from "node:crypto";

// MAIL_SECRET (server-only env) does two jobs:
// 1. Encrypts the SMTP password before it is stored, so the database never holds it in clear.
// 2. Derives the "gate" the server presents to the database's mail functions. The database
//    keeps only a hash of it, so nothing else that can reach the API can use those functions.

function master() {
  const value = process.env.MAIL_SECRET;
  return value && value.length >= 32 ? value : null;
}

export function mailSecretConfigured() {
  return master() !== null;
}

function derive(label: string) {
  const m = master();
  return m ? crypto.createHmac("sha256", m).update(label).digest() : null;
}

export function mailGate() {
  return derive("mail-gate:v1")?.toString("hex") ?? null;
}

/** Stable, non-reversible visitor id for analytics: the same browser on the same IP maps to one id. */
export function visitorId(ip: string, userAgent: string) {
  const key = derive("analytics-visitor:v1");
  return key ? crypto.createHmac("sha256", key).update(`${ip}|${userAgent}`).digest("hex") : null;
}

export function gateHash(gate: string) {
  return crypto.createHash("sha256").update(gate, "utf8").digest("hex");
}

export function encryptSecret(plain: string) {
  const key = derive("smtp-password:v1");
  if (!key) throw new Error("MAIL_SECRET is not set on the server.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), body].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** Null when the value can't be decrypted (for example after MAIL_SECRET changed). */
export function decryptSecret(value: string | null | undefined) {
  const key = derive("smtp-password:v1");
  if (!key || !value) return null;
  const [version, iv, tag, body] = value.split(".");
  if (version !== "v1" || !iv || !tag || !body) return null;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
