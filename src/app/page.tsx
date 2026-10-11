import { Mark } from "@/components/brand/Mark";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getBlocks, getProjects, getSettings } from "@/lib/content";

// Temporary foundation check: brand, tokens, fonts and live content. Replaced by the real home page in step 2.
export default async function Home() {
  const [settings, home, projects] = await Promise.all([getSettings(), getBlocks("home"), getProjects()]);

  return (
    <main style={{ padding: "var(--space-16) var(--edge)", display: "grid", gap: "var(--space-12)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-6)" }}>
        <Mark title={settings.display_name} style={{ width: "4rem" }} />
        <Wordmark style={{ width: "8rem" }} />
        <ThemeToggle />
      </div>
      <h1 style={{ fontSize: "var(--text-h1)", lineHeight: "var(--leading-tight)" }}>
        {home.hero.lines.map((line) => (
          <span key={line} style={{ display: "block" }}>
            {line}
          </span>
        ))}
      </h1>
      <p style={{ color: "var(--color-ink-muted)" }}>{settings.role_line}</p>
      <ul style={{ borderTop: "var(--rule-width) solid var(--color-rule)", padding: 0, margin: 0, listStyle: "none" }}>
        {projects.map((p) => (
          <li key={p.id} style={{ padding: "var(--space-4) 0", borderBottom: "var(--rule-width) solid var(--color-rule)" }}>
            <strong style={{ fontStretch: "var(--stretch-display)" }}>{p.title}</strong> · {p.role}
          </li>
        ))}
      </ul>
    </main>
  );
}
