"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import type { Field, FieldValue } from "@/lib/admin/fields";
import type { FormState } from "../actions";
import { FieldInput } from "./FieldInput";
import styles from "../admin.module.css";

type Props = {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  groups: { group?: string; fields: readonly Field[] }[];
  values: Record<string, FieldValue>;
  submitLabel: string;
  cancelHref?: string;
  extraActions?: React.ReactNode;
};

const INITIAL: FormState = { status: "idle" };

export function EntityForm({ action, groups, values, submitLabel, cancelHref, extraActions }: Props) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  return (
    // Submitted through onSubmit rather than the action prop: a form action resets
    // uncontrolled fields afterwards, which would wipe edits on a validation error.
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {state.status !== "idle" && state.message ? (
        <p
          ref={statusRef}
          tabIndex={-1}
          role={state.status === "error" ? "alert" : "status"}
          className={state.status === "error" ? styles.alertError : styles.alertSuccess}
        >
          {state.message}
        </p>
      ) : null}

      {groups.map((g, i) => (
        <fieldset key={g.group ?? i} className={styles.fieldset}>
          {g.group ? <legend className={`label ${styles.legend}`}>{g.group}</legend> : null}
          {g.fields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              value={values[field.name] ?? null}
              error={state.errors?.[field.name]}
            />
          ))}
        </fieldset>
      ))}

      <div className={styles.formActions}>
        <Button type="submit" loading={pending} icon="check">
          {pending ? "Saving…" : submitLabel}
        </Button>
        {cancelHref ? (
          <Link href={cancelHref} className={styles.smallButton}>
            Cancel
          </Link>
        ) : null}
        {extraActions}
      </div>
    </form>
  );
}
