import { TAGS } from "@/lib/tags";
import type { Field } from "./fields";

// Editable lists. The admin list, form, validation and cache tag all come from here.

export type CollectionKey = "projects" | "services" | "capabilities" | "process" | "experience" | "skills" | "faqs";

export type Collection = {
  key: CollectionKey;
  table: "projects" | "services" | "capabilities" | "process_steps" | "experience" | "skills" | "faqs";
  tag: string;
  label: string;
  singular: string;
  description: string;
  titleField: string;
  subtitleField?: string;
  hasPublished: boolean;
  hasFeatured?: boolean;
  /** Manual drag ordering. Experience is ordered by date instead. */
  sortable: boolean;
  orderBy: { column: string; ascending: boolean }[];
  fields: readonly Field[];
};

export const COLLECTIONS: Record<CollectionKey, Collection> = {
  projects: {
    key: "projects",
    table: "projects",
    tag: TAGS.projects,
    label: "Projects",
    singular: "project",
    description: "Everything on the Work page. Featured projects also appear on the home page (up to three).",
    titleField: "title",
    subtitleField: "role",
    hasPublished: true,
    hasFeatured: true,
    sortable: true,
    orderBy: [{ column: "sort", ascending: true }],
    fields: [
      { name: "title", label: "Title", kind: "text", required: true, max: 120 },
      { name: "slug", label: "Slug", kind: "slug", from: "title", hint: "Leave blank to generate from the title.", half: true },
      { name: "role", label: "Your role", kind: "text", max: 120, half: true },
      { name: "summary", label: "Summary", kind: "textarea", max: 600, required: true },
      { name: "tags", label: "Stack", kind: "tags", hint: "Comma or new line separated.", max: 40 },
      { name: "image_path", label: "Cover image", kind: "image", hint: "16:10 works best." },
      { name: "image_alt", label: "Image description", kind: "text", max: 200, hint: "Describe the image for screen readers." },
      { name: "live_url", label: "Live URL", kind: "url", half: true },
      { name: "year", label: "Year", kind: "text", max: 20, half: true },
      { name: "featured", label: "Feature on home page", kind: "boolean" },
      { name: "published", label: "Published", kind: "boolean" },
    ],
  },
  services: {
    key: "services",
    table: "services",
    tag: TAGS.services,
    label: "Services",
    singular: "service",
    description: "The services grid on the About page.",
    titleField: "title",
    hasPublished: true,
    sortable: true,
    orderBy: [{ column: "sort", ascending: true }],
    fields: [
      { name: "title", label: "Title", kind: "text", required: true, max: 120 },
      { name: "body", label: "Description", kind: "textarea", max: 800 },
      { name: "tags", label: "Tags", kind: "tags", max: 40 },
      { name: "published", label: "Published", kind: "boolean" },
    ],
  },
  capabilities: {
    key: "capabilities",
    table: "capabilities",
    tag: TAGS.capabilities,
    label: "What I do",
    singular: "role",
    description: "Your roles. The short line shows on the home page, the full text on About. Unpublish one to hide it.",
    titleField: "title",
    subtitleField: "short_body",
    hasPublished: true,
    sortable: true,
    orderBy: [{ column: "sort", ascending: true }],
    fields: [
      { name: "title", label: "Title", kind: "text", required: true, max: 80 },
      { name: "short_body", label: "Short line (home)", kind: "text", max: 160 },
      { name: "body", label: "Full description (about)", kind: "textarea", max: 800 },
      { name: "published", label: "Published", kind: "boolean" },
    ],
  },
  process: {
    key: "process",
    table: "process_steps",
    tag: TAGS.process,
    label: "How I work",
    singular: "step",
    description: "The numbered steps on the About page. Order sets the numbers.",
    titleField: "title",
    hasPublished: false,
    sortable: true,
    orderBy: [{ column: "sort", ascending: true }],
    fields: [
      { name: "title", label: "Title", kind: "text", required: true, max: 80 },
      { name: "body", label: "Description", kind: "textarea", max: 600 },
    ],
  },
  experience: {
    key: "experience",
    table: "experience",
    tag: TAGS.experience,
    label: "Experience",
    singular: "role",
    description: "The timeline on the About page, newest first by start date.",
    titleField: "title",
    subtitleField: "org",
    hasPublished: true,
    sortable: false,
    orderBy: [
      { column: "start_date", ascending: false },
      { column: "sort", ascending: true },
    ],
    fields: [
      { name: "title", label: "Job title", kind: "text", required: true, max: 120 },
      { name: "org", label: "Organisation", kind: "text", required: true, max: 160 },
      { name: "meta", label: "Type / location", kind: "text", max: 120, hint: "For example: Contract, Remote." },
      { name: "start_date", label: "Start", kind: "date", required: true, half: true },
      { name: "end_date", label: "End", kind: "date", hint: "Leave blank for Present.", half: true },
      { name: "summary", label: "Summary", kind: "textarea", max: 800 },
      { name: "highlights", label: "Highlights", kind: "text", max: 300, hint: "Projects or sites, separated with ·" },
      { name: "published", label: "Published", kind: "boolean" },
    ],
  },
  skills: {
    key: "skills",
    table: "skills",
    tag: TAGS.skills,
    label: "Tools",
    singular: "tool",
    description: "The tools ticker on the home page and the list on About.",
    titleField: "name",
    hasPublished: true,
    sortable: true,
    orderBy: [{ column: "sort", ascending: true }],
    fields: [
      { name: "name", label: "Name", kind: "text", required: true, max: 60 },
      { name: "published", label: "Published", kind: "boolean" },
    ],
  },
  faqs: {
    key: "faqs",
    table: "faqs",
    tag: TAGS.faqs,
    label: "FAQs",
    singular: "question",
    description: "Questions and answers on the FAQ page. Drag to reorder.",
    titleField: "question",
    hasPublished: true,
    sortable: true,
    orderBy: [{ column: "sort", ascending: true }],
    fields: [
      { name: "question", label: "Question", kind: "text", required: true, max: 300 },
      { name: "answer", label: "Answer", kind: "textarea", required: true, max: 3000, hint: "Plain text. A blank line starts a new paragraph." },
      { name: "published", label: "Published", kind: "boolean" },
    ],
  },
};

export function getCollection(key: string): Collection | null {
  return Object.hasOwn(COLLECTIONS, key) ? COLLECTIONS[key as CollectionKey] : null;
}

export const SETTINGS_FIELDS: { group: string; fields: Field[] }[] = [
  {
    group: "Identity",
    fields: [
      { name: "display_name", label: "Display name", kind: "text", required: true, max: 60, half: true },
      { name: "full_name", label: "Full name", kind: "text", max: 120, half: true },
      { name: "motto", label: "Motto", kind: "text", max: 80, hint: "Shown in the preloader, above the home headline and in the footer." },
      { name: "taglines", label: "Taglines", kind: "lines", hint: "Optional, one per line. Leave empty to hide them on the site.", max: 60 },
      { name: "role_line", label: "Role line", kind: "text", max: 200, hint: "Shown under the home headline." },
      { name: "location", label: "Location", kind: "text", max: 80 },
    ],
  },
  {
    group: "Contact",
    fields: [
      { name: "email", label: "Public email", kind: "email", required: true, half: true },
      { name: "phone", label: "Phone (display)", kind: "text", max: 40, half: true },
      { name: "whatsapp", label: "WhatsApp number", kind: "text", max: 40, hint: "International format, digits only: 2348079451031", half: true },
      { name: "cal_link", label: "Cal.com event", kind: "text", max: 120, hint: "The part after cal.com/, for example layo-dbi0rc/30min", half: true },
      { name: "linkedin_url", label: "LinkedIn URL", kind: "url", half: true },
      { name: "github_url", label: "GitHub URL", kind: "url", half: true },
    ],
  },
  {
    group: "Images and files",
    fields: [
      { name: "portrait_path", label: "Portrait", kind: "image" },
      { name: "portrait_alt", label: "Portrait description", kind: "text", max: 200 },
      { name: "cv_path", label: "CV (PDF)", kind: "file", accept: "application/pdf", hint: "Shows a Download CV button on the Resume page." },
      { name: "og_image_path", label: "Social share image", kind: "image", hint: "1200 × 630. Used when links are shared." },
    ],
  },
  {
    group: "Search and sharing",
    fields: [
      { name: "seo_title", label: "Site title", kind: "text", max: 70 },
      { name: "seo_description", label: "Site description", kind: "textarea", max: 300 },
    ],
  },
  {
    group: "Enquiry form options",
    fields: [
      { name: "service_options", label: "Services", kind: "lines", max: 120 },
      { name: "timeline_options", label: "Timelines", kind: "lines", max: 120 },
    ],
  },
];
