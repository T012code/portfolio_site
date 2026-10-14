// Editable page copy. Each block declares its fields once: the public pages read
// typed content with these defaults, and the admin renders its form from the same list.

import { PRIVACY_DEFAULT, TERMS_DEFAULT } from "./legal";

export type FieldKind = "text" | "textarea" | "lines" | "paragraphs" | "document";

export type FieldDef = { name: string; label: string; kind: FieldKind; hint?: string };

type BlockDef = { label: string; fields: readonly FieldDef[]; defaults: Record<string, string | string[]> };

const text = (name: string, label: string, hint?: string): FieldDef => ({ name, label, kind: "text", hint });
const area = (name: string, label: string, hint?: string): FieldDef => ({ name, label, kind: "textarea", hint });
const doc = (name: string, label: string): FieldDef => ({
  name,
  label,
  kind: "document",
  hint: "Start a line with ## for a heading, ### for a subheading and - for a bullet. Leave a blank line between paragraphs.",
});

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
  resume: {
    header: {
      label: "Header",
      fields: [
        text("label", "Eyebrow"),
        area("headline", "Headline", "The last word shows in the accent colour."),
        text("cv_label", "Download button", "Shown when a CV PDF is uploaded in Settings."),
        text("print_label", "Save as PDF button"),
      ],
      defaults: {
        label: "Resume",
        headline: "Software engineer building secure, polished web products.",
        cv_label: "Download CV",
        print_label: "Save as PDF",
      },
    },
    summary: {
      label: "Profile",
      fields: [
        text("label", "Section label"),
        { name: "paragraphs", label: "Write-up", kind: "paragraphs", hint: "Leave empty to use the About page intro." },
      ],
      defaults: { label: "Profile", paragraphs: [] },
    },
    sections: {
      label: "Section labels",
      fields: [text("experience", "Experience"), text("skills", "Skills"), text("services", "Services"), text("contact", "Contact")],
      defaults: { experience: "Experience", skills: "Skills and tools", services: "What I offer", contact: "Contact" },
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
  faq: {
    header: {
      label: "Header",
      fields: [text("label", "Heading"), area("intro", "Intro")],
      defaults: {
        label: "Questions, answered",
        intro: "How projects run, what they cost and what happens after launch. If your question isn't here, ask it on a call.",
      },
    },
    cta: {
      label: "Closing call to action",
      fields: [text("heading", "Heading"), text("primary_cta", "Button")],
      defaults: { heading: "Still have a question?", primary_cta: "Book a discovery call" },
    },
  },
  privacy: {
    page: {
      label: "Privacy policy",
      fields: [text("title", "Title"), text("updated", "Last updated"), doc("body", "Policy text")],
      defaults: { title: "Privacy policy", updated: "14 October 2026", body: PRIVACY_DEFAULT },
    },
  },
  terms: {
    page: {
      label: "Terms of use",
      fields: [text("title", "Title"), text("updated", "Last updated"), doc("body", "Terms text")],
      defaults: { title: "Terms of use", updated: "14 October 2026", body: TERMS_DEFAULT },
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
      // Fields never saved use the default; a saved empty value is the admin's choice.
      if (field.kind === "lines" || field.kind === "paragraphs") {
        block[field.name] =
          Array.isArray(value) && value.every((v) => typeof v === "string") ? (value as string[]) : (fallback as string[]);
      } else {
        block[field.name] = typeof value === "string" ? value : (fallback as string);
      }
    }
    out[key] = block;
  }
  return out as PageBlocks<P>;
}
