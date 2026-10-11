"use client";

import "./globals.css";

// Last resort when the root layout itself fails (for example, the database is unreachable).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main
          className="wrap"
          style={{ display: "grid", alignContent: "center", gap: "var(--space-8)", minHeight: "100dvh" }}
        >
          <h1 style={{ fontSize: "var(--text-h1)", lineHeight: 1 }}>We&apos;ll be right back.</h1>
          <p style={{ color: "var(--color-ink-muted)", maxWidth: "40ch" }}>
            The site couldn&apos;t load just now. Please try again in a moment.
          </p>
          <p>
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
          </p>
        </main>
      </body>
    </html>
  );
}
