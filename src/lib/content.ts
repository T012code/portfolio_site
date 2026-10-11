import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Row } from "@/lib/supabase/database.types";
import { resolveBlocks, type PageName } from "@/lib/blocks";

// Every public read is cached until the admin changes the matching table,
// which calls updateTag(TAGS.x) from a Server Action.
export const TAGS = {
  settings: "settings",
  blocks: "blocks",
  projects: "projects",
  capabilities: "capabilities",
  services: "services",
  process: "process",
  experience: "experience",
  skills: "skills",
} as const;

export type Settings = Row<"site_settings">;
export type Project = Row<"projects">;
export type Capability = Row<"capabilities">;
export type Service = Row<"services">;
export type ProcessStep = Row<"process_steps">;
export type Experience = Row<"experience">;
export type Skill = Row<"skills">;

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Failed to load ${what}: ${result.error.message}`);
  if (result.data === null) throw new Error(`Failed to load ${what}: no data`);
  return result.data;
}

export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.settings);
  const db = createPublicClient();
  return unwrap(await db.from("site_settings").select("*").eq("id", true).single(), "settings");
}

export async function getBlocks<P extends PageName>(page: P) {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.blocks);
  const db = createPublicClient();
  const rows = unwrap(await db.from("page_blocks").select("key, content").eq("page", page), "page copy");
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.content]));
  return resolveBlocks(page, stored);
}

export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.projects);
  const db = createPublicClient();
  return unwrap(
    await db.from("projects").select("*").eq("published", true).order("sort").order("created_at"),
    "projects",
  );
}

export async function getCapabilities(): Promise<Capability[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.capabilities);
  const db = createPublicClient();
  return unwrap(await db.from("capabilities").select("*").eq("published", true).order("sort"), "capabilities");
}

export async function getServices(): Promise<Service[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.services);
  const db = createPublicClient();
  return unwrap(await db.from("services").select("*").eq("published", true).order("sort"), "services");
}

export async function getProcess(): Promise<ProcessStep[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.process);
  const db = createPublicClient();
  return unwrap(await db.from("process_steps").select("*").order("sort"), "process");
}

export async function getExperience(): Promise<Experience[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.experience);
  const db = createPublicClient();
  return unwrap(
    await db
      .from("experience")
      .select("*")
      .eq("published", true)
      .order("start_date", { ascending: false })
      .order("sort"),
    "experience",
  );
}

export async function getSkills(): Promise<Skill[]> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.skills);
  const db = createPublicClient();
  return unwrap(await db.from("skills").select("*").eq("published", true).order("sort"), "skills");
}
