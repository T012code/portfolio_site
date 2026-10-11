import Link from "next/link";
import { Mark } from "@/components/brand/Mark";

export default function NotFound() {
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
      <h1 style={{ fontSize: "var(--text-poster)", lineHeight: 0.95, letterSpacing: "-0.035em" }}>Not here.</h1>
      <p style={{ fontSize: "var(--text-lead)", color: "var(--color-ink-muted)", maxWidth: "36ch" }}>
        The page you&apos;re looking for has moved or never existed.
      </p>
      <p>
        <Link href="/" style={{ fontWeight: 600, textDecorationColor: "currentColor" }}>
          Back to the home page →
        </Link>
      </p>
    </main>
  );
}
