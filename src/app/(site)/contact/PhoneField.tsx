"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  countryList,
  dialCode,
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

// Flags are small SVGs served from /flags (country-flag-icons, MIT): emoji flags don't render on Windows.
function Flag({ code }: { code: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- 20px decorative SVGs; next/image adds nothing here.
  return <img className={styles.flag} src={`/flags/${code.toLowerCase()}.svg`} alt="" width={20} height={14} loading="lazy" />;
}

type Props = { name: string; label: string; value?: string; error?: string; hint?: string };

// A phone number with its country: the dialling code is preselected for where the visitor is,
// can be changed from a searchable list with flags, and switches by itself when a number is
// pasted with a "+". The form receives one international number (+2348012345678) in a hidden input.
export function PhoneField({ name, label, value, error, hint }: Props) {
  const id = useId();
  const listId = `${id}-countries`;
  const initial = value ? splitPhone(value) : null;
  const [country, setCountry] = useState<CountryCode>(initial?.country ?? "NG");
  const [chosen, setChosen] = useState(Boolean(initial));
  const [national, setNational] = useState(initial?.national ?? (value && !initial ? value : ""));
  const [problem, setProblem] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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

  const countries = useMemo(() => (open ? countryList() : []), [open]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return countries;
    // Names that start with the query come first ("uni" → United …), then other matches.
    const hits = countries.filter((c) => c.name.toLowerCase().includes(q) || c.dial.startsWith(q) || c.code.toLowerCase() === q);
    const starts = (c: (typeof hits)[number]) => (c.name.toLowerCase().startsWith(q) || c.dial.startsWith(q) ? 0 : 1);
    return hits.sort((a, b) => starts(a) - starts(b));
  }, [countries, query]);

  // Close on a click outside the field.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const openList = () => {
    setQuery("");
    setOpen(true);
    queueMicrotask(() => {
      const i = countryList().findIndex((c) => c.code === country);
      setActive(Math.max(0, i));
      searchRef.current?.focus();
    });
  };

  const pick = (code: CountryCode) => {
    setCountry(code);
    setChosen(true);
    setProblem(null);
    setOpen(false);
    numberRef.current?.focus();
  };

  const digits = national.replace(/[^\d]/g, "");
  const full = national ? (normalisePhone(national, country) ?? `+${dialCode(country)}${digits}`) : "";
  const countryName = () => countryList().find((c) => c.code === country)?.name ?? country;

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
    if (national && !normalisePhone(national, country)) setProblem(`Not a valid ${countryName()} number.`);
  };

  const shown = problem ?? error;
  const describedBy = [hint ? `${id}-hint` : null, shown ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field} ref={rootRef}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.phone} data-invalid={shown ? true : undefined}>
        <button
          type="button"
          className={styles.phoneCountry}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={`Country code: +${dialCode(country)}. Change country`}
          onClick={() => (open ? setOpen(false) : openList())}
        >
          <Flag code={country} />
          <span>+{dialCode(country)}</span>
        </button>
        <input
          ref={numberRef}
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
      {open ? (
        <div className={styles.countryPop}>
          <input
            ref={searchRef}
            type="search"
            className={styles.countrySearch}
            placeholder="Search country or code"
            aria-label="Search countries"
            aria-controls={listId}
            aria-activedescendant={matches[active] ? `${listId}-${matches[active].code}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, matches.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (matches[active]) pick(matches[active].code);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          <ul ref={listRef} id={listId} role="listbox" aria-label="Countries" className={styles.countryList}>
            {matches.map((c, i) => (
              <li
                key={c.code}
                id={`${listId}-${c.code}`}
                role="option"
                aria-selected={c.code === country}
                data-index={i}
                data-active={i === active || undefined}
                onPointerMove={() => setActive(i)}
                onClick={() => pick(c.code)}
              >
                <Flag code={c.code} />
                <span className={styles.countryName}>{c.name}</span>
                <span className={styles.countryDial}>+{c.dial}</span>
              </li>
            ))}
            {matches.length === 0 ? <li className={styles.countryEmpty}>No matching country</li> : null}
          </ul>
        </div>
      ) : null}
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
