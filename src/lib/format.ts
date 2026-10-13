import { mediaUrl } from "@/lib/media";
import type { Experience, Project } from "@/lib/content";
import type { ProjectItem } from "@/components/site/ProjectGrid";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Dates are stored as YYYY-MM-DD; format without the server's locale or time zone.
function monthYear(iso: string) {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function experienceRange(e: Pick<Experience, "start_date" | "end_date">) {
  return `${monthYear(e.start_date)} – ${e.end_date ? monthYear(e.end_date) : "Present"}`;
}

export function toProjectItem(p: Project): ProjectItem {
  return {
    id: p.id,
    title: p.title,
    role: p.role,
    summary: p.summary,
    tags: p.tags,
    image: mediaUrl(p.image_path),
    imageAlt: p.image_alt || `${p.title} preview`,
    url: p.live_url,
  };
}

export function whatsappUrl(number: string) {
  const digits = number.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

// Whole years since the earliest role started, from stored data (never a hard-coded claim).
export function yearsSince(experience: Pick<Experience, "start_date">[], today: string) {
  if (experience.length === 0) return 0;
  const [ty, tm] = today.split("-").map(Number);
  const first = experience.reduce((min, e) => (e.start_date < min ? e.start_date : min), experience[0].start_date);
  const [y, m] = first.split("-").map(Number);
  return Math.max(0, Math.floor((ty * 12 + tm - (y * 12 + m)) / 12));
}
