"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Mark } from "@/components/brand/Mark";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className="wrap"
      style={{
        display: "grid",
        alignContent: "center",
        gap: "var(--space-8)",
        minHeight: "100dvh",
        paddingBlock: "var(--space-16)",
      }}
    >
      <Mark style={{ width: "4rem", color: "var(--color-ink)" }} />
      <h1 style={{ fontSize: "var(--text-h1)", lineHeight: 1 }}>Something went wrong.</h1>
      <p style={{ color: "var(--color-ink-muted)", maxWidth: "40ch" }}>
        Try again in a moment. If it keeps happening, use the contact page.
      </p>
      <p style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "var(--space-3) var(--space-5)",
            border: "var(--rule-width) solid var(--color-ink)",
            background: "var(--color-ink)",
            color: "var(--color-paper)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link href="/" style={{ alignSelf: "center", fontWeight: 600 }}>
          Home
        </Link>
      </p>
    </main>
  );
}
