"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/auth";
import { getCollection, SETTINGS_FIELDS } from "@/lib/admin/collections";
import { parseFields, type Field } from "@/lib/admin/fields";
import { BLOCKS, type PageName } from "@/lib/blocks";
import { TAGS } from "@/lib/content";
import { MEDIA_BUCKET } from "@/lib/media";
import type { Json } from "@/lib/supabase/database.types";

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
};

function fail(message: string, errors?: Record<string, string>): FormState {
  return { status: "error", message, errors };
}

function friendly(error: { message: string; code?: string }) {
  if (error.code === "23505") return "That value is already in use. Slugs and names must be unique.";
  if (error.code === "42501") return "You don't have permission to do that. Sign in again.";
  return error.message;
}

// ── Collections ─────────────────────────────────────────────────────────

export async function saveCollectionItem(
  collectionKey: string,
  id: string | null,
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const collection = getCollection(collectionKey);
  if (!collection) return fail("Unknown collection.");
  let session;
  try {
    session = await requireAdminAction();
  } catch (e) {
    return fail((e as Error).message);
  }

  const { values, errors } = parseFields(collection.fields, form);
  if (Object.keys(errors).length > 0) return fail("Check the highlighted fields.", errors);

  // Dynamic table name: the typed client can't narrow it, but the key comes from our own whitelist.
  const table = session.supabase.from(collection.table as "projects");
  if (id) {
    const { error } = await table.update(values as never).eq("id", id);
    if (error) return fail(friendly(error));
  } else {
    let sort = 0;
    if (collection.sortable) {
      const { data } = await session.supabase
        .from(collection.table as "projects")
        .select("sort")
        .order("sort", { ascending: false })
        .limit(1);
      sort = (data?.[0]?.sort ?? 0) + 1;
    }
    const { error } = await table.insert({ ...values, sort } as never);
    if (error) return fail(friendly(error));
  }

  updateTag(collection.tag);
  redirect(`/admin/${collection.key}?saved=1`);
}

export async function deleteCollectionItem(collectionKey: string, id: string) {
  const collection = getCollection(collectionKey);
  if (!collection) throw new Error("Unknown collection.");
  const session = await requireAdminAction();
  const { error } = await session.supabase.from(collection.table as "projects").delete().eq("id", id);
  if (error) throw new Error(friendly(error));
  updateTag(collection.tag);
}

export async function setCollectionFlag(
  collectionKey: string,
  id: string,
  flag: "published" | "featured",
  value: boolean,
) {
  const collection = getCollection(collectionKey);
  if (!collection) throw new Error("Unknown collection.");
  if (flag === "published" && !collection.hasPublished) throw new Error("Not supported.");
  if (flag === "featured" && !collection.hasFeatured) throw new Error("Not supported.");
  const session = await requireAdminAction();
  const { error } = await session.supabase
    .from(collection.table as "projects")
    .update({ [flag]: value } as never)
    .eq("id", id);
  if (error) throw new Error(friendly(error));
  updateTag(collection.tag);
}

export async function reorderCollection(collectionKey: string, ids: string[]) {
  const collection = getCollection(collectionKey);
  if (!collection?.sortable) throw new Error("This list can't be reordered.");
  if (ids.length > 500 || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error("Invalid order.");
  const session = await requireAdminAction();
  const results = await Promise.all(
    ids.map((id, index) =>
      session.supabase
        .from(collection.table as "projects")
        .update({ sort: index + 1 } as never)
        .eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(friendly(failed.error));
  updateTag(collection.tag);
}

// ── Page copy ───────────────────────────────────────────────────────────

export async function savePageBlock(page: string, key: string, _prev: FormState, form: FormData): Promise<FormState> {
  if (!Object.hasOwn(BLOCKS, page)) return fail("Unknown page.");
  const blocks = BLOCKS[page as PageName] as Record<string, { fields: readonly { name: string; label: string; kind: string }[] }>;
  if (!Object.hasOwn(blocks, key)) return fail("Unknown section.");
  let session;
  try {
    session = await requireAdminAction();
  } catch (e) {
    return fail((e as Error).message);
  }

  // Block fields map onto the generic field kinds: lines/paragraphs are line lists.
  const fields: Field[] = blocks[key].fields.map((f) => ({
    name: f.name,
    label: f.label,
    kind: f.kind === "paragraphs" ? "lines" : (f.kind as Field["kind"]),
    max: f.kind === "paragraphs" ? 2000 : f.kind === "textarea" ? 1000 : 200,
  }));
  const { values, errors } = parseFields(fields, form);
  if (Object.keys(errors).length > 0) return fail("Check the highlighted fields.", errors);

  const { error } = await session.supabase
    .from("page_blocks")
    .upsert({ page, key, content: values as Json }, { onConflict: "page,key" });
  if (error) return fail(friendly(error));

  updateTag(TAGS.blocks);
  return { status: "success", message: "Saved. The live page is updated." };
}

// ── Settings ────────────────────────────────────────────────────────────

export async function saveSettings(_prev: FormState, form: FormData): Promise<FormState> {
  let session;
  try {
    session = await requireAdminAction();
  } catch (e) {
    return fail((e as Error).message);
  }
  const fields = SETTINGS_FIELDS.flatMap((g) => g.fields);
  const { values, errors } = parseFields(fields, form);
  if (Object.keys(errors).length > 0) return fail("Check the highlighted fields.", errors);
  if (typeof values.whatsapp === "string") values.whatsapp = values.whatsapp.replace(/\D/g, "");

  const { error } = await session.supabase.from("site_settings").update(values as never).eq("id", true);
  if (error) return fail(friendly(error));

  updateTag(TAGS.settings);
  return { status: "success", message: "Settings saved." };
}

// ── Media ───────────────────────────────────────────────────────────────

export type MediaInput = { path: string; mime: string; size: number; width: number | null; height: number | null };

export async function registerMedia(input: MediaInput) {
  const session = await requireAdminAction();
  if (!/^uploads\/[\w./-]+$/.test(input.path) || input.path.includes("..")) throw new Error("Invalid path.");
  const { data, error } = await session.supabase
    .from("media")
    .insert({
      path: input.path,
      mime: input.mime.slice(0, 100),
      size_bytes: Math.max(0, Math.floor(input.size)),
      width: input.width,
      height: input.height,
    })
    .select("*")
    .single();
  if (error) throw new Error(friendly(error));
  return data;
}

export async function updateMediaAlt(id: string, alt: string) {
  const session = await requireAdminAction();
  const { error } = await session.supabase.from("media").update({ alt: alt.trim().slice(0, 300) }).eq("id", id);
  if (error) throw new Error(friendly(error));
}

export async function deleteMedia(id: string) {
  const session = await requireAdminAction();
  const { data: row, error: readError } = await session.supabase.from("media").select("path").eq("id", id).single();
  if (readError || !row) throw new Error("File not found.");

  // Refuse to delete files that are still in use on the site.
  const [projects, settings] = await Promise.all([
    session.supabase.from("projects").select("title").eq("image_path", row.path),
    session.supabase
      .from("site_settings")
      .select("id")
      .or(`portrait_path.eq.${row.path},cv_path.eq.${row.path},og_image_path.eq.${row.path}`),
  ]);
  const usedBy = [
    ...(projects.data ?? []).map((p) => `project "${p.title}"`),
    ...((settings.data ?? []).length > 0 ? ["site settings"] : []),
  ];
  if (usedBy.length > 0) throw new Error(`Still used by ${usedBy.join(", ")}. Replace it there first.`);

  const { error: storageError } = await session.supabase.storage.from(MEDIA_BUCKET).remove([row.path]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await session.supabase.from("media").delete().eq("id", id);
  if (error) throw new Error(friendly(error));
}

// ── Session ─────────────────────────────────────────────────────────────

export async function signOut() {
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ── Inbox ───────────────────────────────────────────────────────────────

const ENQUIRY_STATUSES = ["new", "booked", "replied", "archived"] as const;
const MESSAGE_STATUSES = ["new", "replied", "archived"] as const;

export async function updateInboxItem(
  kind: "enquiries" | "messages",
  id: string,
  patch: { status?: string; admin_notes?: string },
) {
  if (kind !== "enquiries" && kind !== "messages") throw new Error("Unknown inbox.");
  const allowed: readonly string[] = kind === "enquiries" ? ENQUIRY_STATUSES : MESSAGE_STATUSES;
  const update: { status?: string; admin_notes?: string } = {};
  if (patch.status !== undefined) {
    if (!allowed.includes(patch.status)) throw new Error("Unknown status.");
    update.status = patch.status;
  }
  if (patch.admin_notes !== undefined) update.admin_notes = patch.admin_notes.slice(0, 5000);
  const session = await requireAdminAction();
  const { error } = await session.supabase.from(kind).update(update).eq("id", id);
  if (error) throw new Error(friendly(error));
  refresh();
}
