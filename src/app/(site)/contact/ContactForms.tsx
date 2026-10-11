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
  options: { services: string[]; budgets: string[]; timelines: string[] };
  calLink: string;
  email: string;
};

const IDLE: SubmitState = { status: "idle" };

export function ContactForms({ labels, options, calLink, email }: Props) {
  const [tab, setTab] = useState<"enquiry" | "message">("enquiry");
  const tabsId = useId();

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
        <EnquiryForm options={options} calLink={calLink} email={email} responseNote={labels.responseNote} />
      </div>
      <div
        role="tabpanel"
        id={`${tabsId}-message`}
        aria-labelledby={`${tabsId}-message-tab`}
        hidden={tab !== "message"}
      >
        <MessageForm responseNote={labels.responseNote} />
      </div>
    </div>
  );
}

function useSubmit(action: (prev: SubmitState, form: FormData) => Promise<SubmitState>) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const startedAt = useRef(0);
  const alertRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (state.status === "error") alertRef.current?.focus();
  }, [state]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set("started", String(startedAt.current));
    startTransition(() => formAction(data));
  };

  return { state, pending, onSubmit, alertRef };
}

function EnquiryForm({
  options,
  calLink,
  email,
  responseNote,
}: {
  options: Props["options"];
  calLink: string;
  email: string;
  responseNote: string;
}) {
  const { state, pending, onSubmit, alertRef } = useSubmit(submitEnquiry);
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
    <form onSubmit={onSubmit} className={styles.form} noValidate>
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
        <SelectField name="budget" label="Budget range" options={options.budgets} value={values.budget} />
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

function MessageForm({ responseNote }: { responseNote: string }) {
  const { state, pending, onSubmit, alertRef } = useSubmit(submitMessage);
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
    <form onSubmit={onSubmit} className={styles.form} noValidate>
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
