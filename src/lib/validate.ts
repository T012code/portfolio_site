// Shared form checks: run in the browser as people type, and again on the server.

const LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

// Misspellings of the big providers, mapped to what was meant.
const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "hotmal.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
};

/** Why an email address can't be used, or null when it looks deliverable. */
export function emailProblem(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Add your email address.";
  if (value.length > 254) return "That email is too long.";
  const at = value.lastIndexOf("@");
  if (at < 1 || at === value.length - 1) return "That email isn't complete.";
  const local = value.slice(0, at);
  const domain = value.slice(at + 1).toLowerCase();
  if (local.length > 64 || !LOCAL.test(local)) return "Check the part before the @.";
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some((l) => !LABEL.test(l))) return "Check the part after the @.";
  if (!/^[a-z]{2,}$/.test(labels[labels.length - 1])) return "Add an ending, like .com.";
  const fix = TYPOS[domain];
  if (fix) return `Did you mean ${local}@${fix}?`;
  return null;
}

/** The email as stored: trimmed, with the domain in lower case. */
export function normaliseEmail(raw: string) {
  const value = raw.trim();
  const at = value.lastIndexOf("@");
  return at < 0 ? value : `${value.slice(0, at)}@${value.slice(at + 1).toLowerCase()}`;
}
