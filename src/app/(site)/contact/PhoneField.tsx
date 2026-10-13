"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import {
  countryList,
  dialCode,
  flag,
  formatAsYouType,
  isCountry,
  normalisePhone,
  splitPhone,
  type CountryCode,
} from "@/lib/phone";
import styles from "./contact.module.css";

// Where the visitor is: Vercel's country header first, then the browser's time zone and language.
let detected: Promise<CountryCode | null> | null = null;
function detectCountry() {
  detected ??= fetch("/api/geo", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<{ country: string | null }>) : { country: null }))
    .then(({ country }) => (isCountry(country) ? country : null))
    .catch(() => null)
    .then((country) => {
      if (country) return country;
      try {
        if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Lagos") return "NG";
        const region = new Intl.Locale(navigator.language).maximize().region;
        return isCountry(region) ? region : null;
      } catch {
        return null;
      }
    });
  return detected;
}

const subscribe = () => () => {};

type Props = { name: string; label: string; value?: string; error?: string; hint?: string };

// A phone number with its country: the dialling code is preselected for where the visitor is,
// can be changed from the list, and switches by itself when a number is pasted with a "+".
// The form receives one international number (+2348012345678) in a hidden input.
export function PhoneField({ name, label, value, error, hint }: Props) {
  const id = useId();
  const initial = value ? splitPhone(value) : null;
  const [country, setCountry] = useState<CountryCode>(initial?.country ?? "NG");
  const [chosen, setChosen] = useState(Boolean(initial));
  const [national, setNational] = useState(initial?.national ?? (value && !initial ? value : ""));
  const [problem, setProblem] = useState<string | null>(null);
  // Country names come from the browser's Intl data, so the full list renders after hydration.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const countries = useMemo(() => countryList(), []);
  const countryName = countries.find((c) => c.code === country)?.name ?? country;

  useEffect(() => {
    if (chosen) return;
    let live = true;
    detectCountry().then((c) => {
      if (live && c) setCountry(c);
    });
    return () => {
      live = false;
    };
  }, [chosen]);

  const digits = national.replace(/[^\d]/g, "");
  const full = national ? (normalisePhone(national, country) ?? `+${dialCode(country)}${digits}`) : "";

  const onType = (raw: string) => {
    setProblem(null);
    if (raw.trim().startsWith("+")) {
      // An international number: let it pick the country.
      const split = splitPhone(raw);
      if (split) {
        setCountry(split.country);
        setChosen(true);
        setNational(split.national);
        return;
      }
    }
    setNational(raw.length < national.length ? raw : formatAsYouType(raw, country));
  };

  const check = () => {
    if (national && !normalisePhone(national, country)) setProblem(`That doesn't look like a valid ${countryName} number.`);
  };

  const shown = problem ?? error;
  const describedBy = [hint ? `${id}-hint` : null, shown ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.phone} data-invalid={shown ? true : undefined}>
        <span className={styles.phoneCountry}>
          <span aria-hidden="true">
            {flag(country)} +{dialCode(country)}
          </span>
          <select
            aria-label="Country code"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value as CountryCode);
              setChosen(true);
              setProblem(null);
            }}
          >
            {mounted ? (
              countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {flag(c.code)} {c.name} (+{c.dial})
                </option>
              ))
            ) : (
              <option value={country}>
                {flag(country)} +{dialCode(country)}
              </option>
            )}
          </select>
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className={styles.phoneInput}
          value={national}
          maxLength={24}
          placeholder="Phone number"
          onChange={(e) => onType(e.target.value)}
          onBlur={check}
          aria-invalid={shown ? true : undefined}
          aria-describedby={describedBy}
        />
      </div>
      <input type="hidden" name={name} value={full} />
      {hint ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {shown ? (
        <span id={`${id}-error`} className={styles.error}>
          {shown}
        </span>
      ) : null}
    </div>
  );
}
