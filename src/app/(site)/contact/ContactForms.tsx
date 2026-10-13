"use client";

import dynamic from "next/dynamic";
import { startTransition, useActionState, useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { submitEnquiry, submitMessage, type SubmitState } from "./actions";
import styles from "./contact.module.css";

const CalBooking = dynamic(() => import("./CalBooking").then((m) => m.CalBooking), {
  ssr: false,
  loading: () => <p className={styles.note}>Loading the calendar…</p>,
});

type Props = {
  labels: { enquiry: string; message: string; responseNote: string };
  options: { services: string[]; timelines: string[] };
  calLink: string;
  email: string;
  /** reCAPTCHA v3 site key when spam protection is on. */
  recaptchaKey: string | null;
};

type Grecaptcha = { ready: (cb: () => void) => void; execute: (key: string, opts: { action: string }) => Promise<string> };

let recaptchaScript: Promise<Grecaptcha | null> | null = null;

// Loads Google's script once, on the contact page only.
function loadRecaptcha(key: string) {
  recaptchaScript ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
    script.async = true;
    script.onload = () => {
      const g = (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
      if (g) g.ready(() => resolve(g));
      else resolve(null);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return recaptchaScript;
}

async function recaptchaToken(key: string | null, action: string) {
  if (!key) return "";
  try {
    const g = await loadRecaptcha(key);
    return g ? await g.execute(key, { action }) : "";
  } catch {
    return "";
  }
}

const IDLE: SubmitState = { status: "idle" };

export function ContactForms({ labels, options, calLink, email, recaptchaKey }: Props) {
  const [tab, setTab] = useState<"enquiry" | "message">("enquiry");
  const tabsId = useId();

  useEffect(() => {
    if (recaptchaKey) void loadRecaptcha(recaptchaKey);
  }, [recaptchaKey]);

  return (
    <div className={styles.forms}>
      <div role="tablist" aria-label="How would you like to get in touch?" className={styles.tabs}>
        {(["enquiry", "message"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            id={`${tabsId}-${key}-tab`}
            aria-controls={`${tabsId}-${key}`}
            aria-selected={tab === key}
            tabIndex={tab === key ? 0 : -1}
            className={styles.tab}
            onClick={() => setTab(key)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const next = key === "enquiry" ? "message" : "enquiry";
                setTab(next);
                document.getElementById(`${tabsId}-${next}-tab`)?.focus();
              }
            }}
          >
            {key === "enquiry" ? labels.enquiry : labels.message}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-enquiry`}
        aria-labelledby={`${tabsId}-enquiry-tab`}
        hidden={tab !== "enquiry"}
      >
        <EnquiryForm
          options={options}
          calLink={calLink}
          email={email}
          responseNote={labels.responseNote}
          recaptchaKey={recaptchaKey}
        />
      </div>
      <div
        role="tabpanel"
        id={`${tabsId}-message`}
        aria-labelledby={`${tabsId}-message-tab`}
        hidden={tab !== "message"}
      >
        <MessageForm responseNote={labels.responseNote} recaptchaKey={recaptchaKey} />
      </div>
      {recaptchaKey ? (
        <p className={styles.recaptchaNote}>
          Protected by reCAPTCHA. Google&apos;s{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener">
            Terms of Service
          </a>{" "}
          apply.
        </p>
      ) : null}
    </div>
  );
}

function useSubmit(
  action: (prev: SubmitState, form: FormData) => Promise<SubmitState>,
  recaptcha: { key: string | null; action: "enquiry" | "message" },
) {
  const [state, formAction, submitting] = useActionState(action, IDLE);
  const [checking, setChecking] = useState(false);
  const pending = submitting || checking;
  const startedAt = useRef(0);
  const alertRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (state.status === "error") alertRef.current?.focus();
  }, [state]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    data.set("started", String(startedAt.current));
    if (recaptcha.key) {
      setChecking(true);
      data.set("recaptcha_token", await recaptchaToken(recaptcha.key, recaptcha.action));
      setChecking(false);
    }
    startTransition(() => formAction(data));
  };

  return { state, pending, onSubmit, alertRef };
}

function EnquiryForm({
  options,
  calLink,
  email,
  responseNote,
  recaptchaKey,
}: {
  options: Props["options"];
  calLink: string;
  email: string;
  responseNote: string;
  recaptchaKey: string | null;
}) {
  const { state, pending, onSubmit, alertRef } = useSubmit(submitEnquiry, { key: recaptchaKey, action: "enquiry" });
  const [booked, setBooked] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const onBooked = useCallback(() => setBooked(true), []);
  const doneRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state.status === "success") doneRef.current?.focus();
  }, [state.status, booked, skipped]);

  if (state.status === "success") {
    if (booked || skipped || !calLink) {
      return (
        <div className={styles.done}>
          <Icon name="check" size={28} />
          <h2 ref={doneRef} tabIndex={-1} className={styles.doneTitle}>
            {booked ? "You're booked in." : "Enquiry received."}
          </h2>
          <p>
            {booked
              ? "A calendar invite is on its way to your inbox. Talk soon."
              : `${responseNote} If it's urgent, email ${email}.`}
          </p>
        </div>
      );
    }
    return (
      <div className={styles.booking}>
        <div className={styles.bookingHead}>
          <p className="label">Step 2 of 2</p>
          <h2 ref={doneRef} tabIndex={-1} className={styles.doneTitle}>
            Got it. Now pick a time for a call.
          </h2>
          <p className={styles.note}>Your details are filled in. Choose a slot that suits you.</p>
          <button type="button" className={styles.skip} onClick={() => setSkipped(true)}>
            Skip for now, I&apos;ll wait for your reply
          </button>
        </div>
        <CalBooking calLink={calLink} enquiryId={state.id} prefill={state.prefill} onBooked={onBooked} />
      </div>
    );
  }

  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  return (
    <form method="post" onSubmit={onSubmit} className={styles.form} noValidate>
      <p className={styles.step}>
        <span className="label">Step 1 of 2</span> Tell me about the project, then pick a call time.
      </p>
      {state.status === "error" ? (
        <p ref={alertRef} tabIndex={-1} role="alert" className={styles.alert}>
          {state.message}
        </p>
      ) : null}
      <Honeypot />
      <div className={styles.row2}>
        <TextField name="name" label="Full name" required autoComplete="name" value={values.name} error={errors.name} />
        <TextField name="email" label="Email" type="email" required autoComplete="email" value={values.email} error={errors.email} />
      </div>
      <div className={styles.row2}>
        <TextField name="whatsapp" label="WhatsApp number" type="tel" autoComplete="tel" value={values.whatsapp} />
        <TextField name="company" label="Company or organisation" autoComplete="organization" value={values.company} />
      </div>
      <ChoiceGroup name="service" legend="What do you need?" options={options.services} value={values.service} />
      <div className={styles.row2}>
        <BudgetField amount={values.budget_amount} currency={values.budget_currency} error={errors.budget_amount} />
        <SelectField name="timeline" label="Timeline" options={options.timelines} value={values.timeline} />
      </div>
      <TextField
        name="message"
        label="Tell me about the project"
        multiline
        required
        value={values.message}
        error={errors.message}
        hint="What you're building, what exists already, and what a good outcome looks like."
      />
      <div className={styles.submitRow}>
        <Button type="submit" loading={pending} icon="arrow-right">
          {pending ? "Sending…" : "Continue to booking"}
        </Button>
        <p className={styles.note}>{responseNote}</p>
      </div>
    </form>
  );
}

function MessageForm({ responseNote, recaptchaKey }: { responseNote: string; recaptchaKey: string | null }) {
  const { state, pending, onSubmit, alertRef } = useSubmit(submitMessage, { key: recaptchaKey, action: "message" });
  const doneRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state.status === "success") doneRef.current?.focus();
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div className={styles.done}>
        <Icon name="check" size={28} />
        <h2 ref={doneRef} tabIndex={-1} className={styles.doneTitle}>
          Message sent.
        </h2>
        <p>{responseNote}</p>
      </div>
    );
  }

  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.errors ?? {}) : {};

  return (
    <form method="post" onSubmit={onSubmit} className={styles.form} noValidate>
      {state.status === "error" ? (
        <p ref={alertRef} tabIndex={-1} role="alert" className={styles.alert}>
          {state.message}
        </p>
      ) : null}
      <Honeypot />
      <div className={styles.row2}>
        <TextField name="name" label="Full name" required autoComplete="name" value={values.name} error={errors.name} />
        <TextField name="email" label="Email" type="email" required autoComplete="email" value={values.email} error={errors.email} />
      </div>
      <TextField name="whatsapp" label="WhatsApp number" type="tel" autoComplete="tel" value={values.whatsapp} />
      <TextField name="message" label="Message" multiline required value={values.message} error={errors.message} />
      <div className={styles.submitRow}>
        <Button type="submit" loading={pending} icon="arrow-right">
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}

function Honeypot() {
  return (
    <div className={styles.honeypot} aria-hidden="true">
      <label>
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

function TextField({
  name,
  label,
  type = "text",
  required,
  multiline,
  autoComplete,
  value,
  error,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  autoComplete?: string;
  value?: string;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const props = {
    id,
    name,
    required,
    defaultValue: value,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: styles.input,
  };
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required ? <span className={styles.required}> (required)</span> : null}
      </label>
      {multiline ? <textarea {...props} rows={6} maxLength={5000} /> : <input {...props} type={type} />}
      {hint ? (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

const CURRENCIES = [
  { code: "NGN", symbol: "₦", label: "Naira" },
  { code: "USD", symbol: "$", label: "US dollars" },
] as const;

// Visitors in Nigeria start on Naira, everyone else on US dollars. They can switch either way.
function defaultCurrency() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Lagos" ? "NGN" : "USD";
  } catch {
    return "NGN";
  }
}

// "1500000" → "1,500,000"; anything that isn't a plain number (a range, "flexible") is left as typed.
function groupDigits(value: string) {
  const plain = value.replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(plain)) return value;
  const [whole, cents] = plain.split(".");
  return Number(whole).toLocaleString("en-GB") + (cents ? `.${cents}` : "");
}

function BudgetField({ amount, currency, error }: { amount?: string; currency?: string; error?: string }) {
  const id = useId();
  const [code, setCode] = useState<string>(() => (currency === "NGN" || currency === "USD" ? currency : "NGN"));
  const [value, setValue] = useState(amount ?? "");
  const symbol = CURRENCIES.find((c) => c.code === code)?.symbol ?? "";

  useEffect(() => {
    // Picked after hydration so server and client render the same first frame.
    if (!currency) queueMicrotask(() => setCode(defaultCurrency()));
  }, [currency]);

  return (
    <div className={styles.field}>
      <div className={styles.budgetHead}>
        <label htmlFor={id} className={styles.label}>
          Budget
        </label>
        <div className={styles.currency} role="radiogroup" aria-label="Currency">
          {CURRENCIES.map((c) => (
            <label key={c.code} className={styles.currencyOption}>
              <input
                type="radio"
                name="budget_currency"
                value={c.code}
                checked={code === c.code}
                onChange={() => setCode(c.code)}
                aria-label={c.label}
              />
              <span>
                {c.symbol} {c.code}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.money}>
        <span className={styles.moneySymbol} aria-hidden="true">
          {symbol}
        </span>
        <input
          id={id}
          name="budget_amount"
          className={styles.input}
          inputMode="decimal"
          autoComplete="off"
          maxLength={60}
          placeholder={code === "NGN" ? "e.g. 1,500,000" : "e.g. 3,000"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setValue((v) => groupDigits(v.trim()))}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
        />
      </div>
      <p id={`${id}-hint`} className={styles.hint}>
        {error ?? "A rough figure or a range is fine."}
      </p>
    </div>
  );
}

function SelectField({ name, label, options, value }: { name: string; label: string; options: string[]; value?: string }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select id={id} name={name} defaultValue={value ?? ""} className={`${styles.input} ${styles.select}`}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChoiceGroup({ name, legend, options, value }: { name: string; legend: string; options: string[]; value?: string }) {
  if (options.length === 0) return null;
  return (
    <fieldset className={styles.choices}>
      <legend className={styles.label}>{legend}</legend>
      <div className={styles.chips}>
        {options.map((o) => (
          <label key={o} className={styles.chip}>
            <input type="radio" name={name} value={o} defaultChecked={value === o} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
