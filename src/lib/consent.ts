"use client";

import { useSyncExternalStore } from "react";

// The visitor's cookie choice, kept in this browser. Only the optional visit counting depends on it;
// the theme, spam protection and booking calendar are necessary and run either way (see the privacy policy).

const KEY = "layo-consent";
/** Bump when the notice covers something new, so everyone is asked again. */
export const CONSENT_VERSION = 1;
/** Ask again after a year. */
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const CHANGE_EVENT = "layo:consent";
const OPEN_EVENT = "layo:consent-open";

export type Consent = {
  /** Notice version the choice was made on. */
  v: number;
  analytics: boolean;
  /** ISO date of the choice. */
  at: string;
  /** Random id for this browser's choices; the consent log is keyed by it. */
  id: string;
};

function parse(raw: string | null): Consent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Consent>;
    if (value.v !== CONSENT_VERSION || typeof value.analytics !== "boolean") return null;
    if (typeof value.id !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(value.id)) return null;
    const at = typeof value.at === "string" ? Date.parse(value.at) : NaN;
    if (!Number.isFinite(at) || Date.now() - at > MAX_AGE_MS) return null;
    return value as Consent;
  } catch {
    return null;
  }
}

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// useSyncExternalStore needs the same object back while nothing has changed.
let cache: { raw: string | null; value: Consent | null } | undefined;
// Without storage (some private modes) the choice still holds for this page view.
let memory: Consent | null = null;

export function readConsent(): Consent | null {
  const raw = readRaw();
  if (raw === null && memory) return memory;
  if (!cache || cache.raw !== raw) cache = { raw, value: parse(raw) };
  return cache.value;
}

/** Saves a choice, tells the open page, and records it in the consent log. */
export function saveConsent(analytics: boolean): Consent {
  const consent: Consent = {
    v: CONSENT_VERSION,
    analytics,
    at: new Date().toISOString(),
    id: readConsent()?.id ?? crypto.randomUUID(),
  };
  memory = consent;
  try {
    localStorage.setItem(KEY, JSON.stringify(consent));
  } catch {
    // Kept in memory instead; the notice shows again next visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  const body = JSON.stringify({ id: consent.id, analytics, version: CONSENT_VERSION });
  if (!navigator.sendBeacon?.("/api/consent", new Blob([body], { type: "application/json" }))) {
    void fetch("/api/consent", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(
      () => {},
    );
  }
  return consent;
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  // A choice made in another tab applies here too.
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** The current choice: null when none has been made, undefined while rendering on the server. */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore<Consent | null | undefined>(subscribe, readConsent, () => undefined);
}

/** Reopens the cookie notice (the footer's "Cookie settings"). */
export function openConsent() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenConsent(callback: () => void) {
  window.addEventListener(OPEN_EVENT, callback);
  return () => window.removeEventListener(OPEN_EVENT, callback);
}
