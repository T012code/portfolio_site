// Editable page copy. Each block declares its fields once: the public pages read
// typed content with these defaults, and the admin renders its form from the same list.

export type FieldKind = "text" | "textarea" | "lines" | "paragraphs";

export type FieldDef = { name: string; label: string; kind: FieldKind; hint?: string };

type BlockDef = { label: string; fields: readonly FieldDef[]; defaults: Record<string, string | string[]> };

const text = (name: string, label: string, hint?: string): FieldDef => ({ name, label, kind: "text", hint });
const area = (name: string, label: string, hint?: string): FieldDef => ({ name, label, kind: "textarea", hint });

export const BLOCKS = {
  home: {
    hero: {
      label: "Hero",
      fields: [
        { name: "lines", label: "Headline lines", kind: "lines", hint: "One line per row; each line animates in on its own." },
        text("primary_cta", "Primary button"),
        text("secondary_cta", "Secondary button"),
      ],
      defaults: {
        lines: ["I build secure, polished", "web products, from", "idea to production."],
        primary_cta: "Book a discovery call",
        secondary_cta: "See work",
      },
    },
    featured: {
      label: "Featured work",
      fields: [text("label", "Section label"), text("link", "Link label")],
      defaults: { label: "Featured work", link: "View all work" },
    },
    what_i_do: {
      label: "What I do",
      fields: [text("label", "Section label"), text("link", "Link label")],
      defaults: { label: "What I do", link: "How I work" },
    },
    cta: {
      label: "Closing call to action",
      fields: [text("heading", "Heading"), text("primary_cta", "Primary button"), text("secondary_cta", "Secondary button")],
      defaults: { heading: "Let's build something.", primary_cta: "Book a discovery call", secondary_cta: "About me" },
    },
  },
  about: {
    intro: {
      label: "Intro",
      fields: [text("label", "Section label"), { name: "paragraphs", label: "Paragraphs", kind: "paragraphs" }],
      defaults: { label: "About me", paragraphs: [] },
    },
    what_i_do: { label: "What I do", fields: [text("label", "Section label")], defaults: { label: "What I do" } },
    services: { label: "Services", fields: [text("label", "Section label")], defaults: { label: "Services" } },
    process: { label: "How I work", fields: [text("label", "Section label")], defaults: { label: "How I work" } },
    experience: {
      label: "Experience",
      fields: [text("label", "Section label"), text("cv_label", "CV button")],
      defaults: { label: "Experience", cv_label: "Download CV" },
    },
    tools: {
      label: "Tools",
      fields: [text("label", "Section label"), area("note", "Note under the list")],
      defaults: { label: "Tools I use", note: "" },
    },
    cta: {
      label: "Closing call to action",
      fields: [text("heading", "Heading"), text("primary_cta", "Primary button"), text("secondary_cta", "Secondary button")],
      defaults: { heading: "Ready to start a project?", primary_cta: "Book a discovery call", secondary_cta: "See my work" },
    },
  },
  work: {
    header: {
      label: "Header",
      fields: [text("label", "Heading"), area("intro", "Intro")],
      defaults: { label: "Work", intro: "" },
    },
    cta: {
      label: "Closing call to action",
      fields: [text("heading", "Heading"), text("primary_cta", "Button")],
      defaults: { heading: "Have a project in mind?", primary_cta: "Book a discovery call" },
    },
  },
  contact: {
    header: {
      label: "Header and form labels",
      fields: [
        text("label", "Heading"),
        area("intro", "Intro"),
        text("enquiry_tab", "Enquiry tab"),
        text("message_tab", "Message tab"),
        text("response_note", "Response note"),
      ],
      defaults: {
        label: "Get in touch",
        intro: "",
        enquiry_tab: "Service enquiry",
        message_tab: "Quick message",
        response_note: "I'll respond within 24 hours.",
      },
    },
  },
} as const satisfies Record<string, Record<string, BlockDef>>;

export type PageName = keyof typeof BLOCKS;

type FieldValue<F> = F extends { kind: "lines" | "paragraphs" } ? string[] : string;
export type BlockContent<P extends PageName, K extends keyof (typeof BLOCKS)[P]> =
  (typeof BLOCKS)[P][K] extends { fields: readonly (infer F)[] }
    ? { [Field in F as Field extends { name: infer N extends string } ? N : never]: FieldValue<Field> }
    : never;

export type PageBlocks<P extends PageName> = { [K in keyof (typeof BLOCKS)[P]]: BlockContent<P, K> };

// Merge stored JSON over defaults, keeping only declared fields with the right shape.
export function resolveBlocks<P extends PageName>(page: P, stored: Record<string, unknown>): PageBlocks<P> {
  const defs = BLOCKS[page] as Record<string, BlockDef>;
  const out: Record<string, Record<string, string | string[]>> = {};
  for (const [key, def] of Object.entries(defs)) {
    const raw = (stored[key] ?? {}) as Record<string, unknown>;
    const block: Record<string, string | string[]> = {};
    for (const field of def.fields) {
      const value = raw[field.name];
      const fallback = def.defaults[field.name] ?? (field.kind === "lines" || field.kind === "paragraphs" ? [] : "");
      if (field.kind === "lines" || field.kind === "paragraphs") {
        block[field.name] =
          Array.isArray(value) && value.every((v) => typeof v === "string") && value.length > 0
            ? (value as string[])
            : (fallback as string[]);
      } else {
        block[field.name] = typeof value === "string" && value.trim() !== "" ? value : (fallback as string);
      }
    }
    out[key] = block;
  }
  return out as PageBlocks<P>;
}
