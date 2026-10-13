import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { getSettings } from "@/lib/content";
import { SITE_URL } from "@/lib/env";
import { mailSecretConfigured } from "@/lib/mail/secret";
import type { Row } from "@/lib/supabase/database.types";
import { ConnectionForm } from "./ConnectionForm";
import { RepliesForm } from "./RepliesForm";
import { Thread } from "./Thread";
import styles from "../../admin.module.css";

const TABS = [
  { key: "messages", label: "Conversations" },
  { key: "replies", label: "Auto-replies" },
  { key: "setup", label: "Setup" },
] as const;

const timeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

export default async function WhatsAppPage({ searchParams }: { searchParams: Promise<{ tab?: string; c?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireAdminPage();
  const [{ data: settings, error }, { data: secrets }] = await Promise.all([
    supabase.from("whatsapp_settings").select("*").eq("id", true).single(),
    supabase.rpc("whatsapp_secret_status"),
  ]);
  const has = (secrets ?? {}) as { token_set?: boolean; app_secret_set?: boolean };
  const configured = Boolean(settings?.phone_number_id && has.token_set);
  const tab = TABS.some((t) => t.key === params.tab) ? params.tab! : configured ? "messages" : "setup";
  const on = Boolean(settings?.enabled && configured);

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>WhatsApp</h1>
          <p className={styles.pageIntro}>
            Your WhatsApp Business number, connected through Meta: automatic replies to new messages, a confirmation for visitors
            who leave a WhatsApp number, and replies from here.
          </p>
        </div>
        <span className={styles.tone} data-tone={on ? "ok" : settings?.enabled ? "error" : "neutral"}>
          {on ? "On" : settings?.enabled ? "Needs setup" : "Off"}
        </span>
      </header>

      <nav className={styles.tabs} aria-label="WhatsApp sections">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/whatsapp?tab=${t.key}`} className={styles.tab} aria-current={tab === t.key ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      {error ? <p className={styles.alertError}>{error.message}</p> : null}
      {!mailSecretConfigured() ? (
        <p className={styles.alertError} role="alert">
          The server key MAIL_SECRET is missing, so the WhatsApp token can&apos;t be stored and messages can&apos;t be logged. Add it
          in Vercel → Settings → Environment Variables and redeploy.
        </p>
      ) : null}

      {settings && tab === "setup" ? (
        <div className={styles.sections}>
          <ConnectionForm
            enabled={settings.enabled}
            phoneNumberId={settings.phone_number_id}
            businessAccountId={settings.business_account_id}
            graphVersion={settings.graph_version}
            displayNumber={settings.display_number}
            tokenSet={Boolean(has.token_set)}
            appSecretSet={Boolean(has.app_secret_set)}
            verifyToken={settings.verify_token}
            webhookUrl={`${SITE_URL}/api/whatsapp`}
          />
          <SetupSteps />
        </div>
      ) : null}

      {settings && tab === "replies" ? <Replies settings={settings} /> : null}
      {tab === "messages" ? <Conversations selected={params.c} configured={configured} /> : null}
    </>
  );
}

async function Replies({ settings }: { settings: Row<"whatsapp_settings"> }) {
  const site = await getSettings();
  return (
    <RepliesForm
      autoreplyEnabled={settings.autoreply_enabled}
      body={settings.autoreply_body}
      cooldown={settings.autoreply_cooldown_hours}
      notifyEmail={settings.notify_email}
      templateEnabled={settings.form_template_enabled}
      templateName={settings.form_template_name}
      templateLang={settings.form_template_lang}
      brand={site.display_name}
    />
  );
}

async function Conversations({ selected, configured }: { selected?: string; configured: boolean }) {
  const { supabase } = await requireAdminPage();
  const { data: recent } = await supabase
    .from("whatsapp_messages")
    .select("wa_id, contact_name, body, direction, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  const threads = new Map<string, { waId: string; name: string; last: string; preview: string; direction: string; count: number }>();
  for (const m of recent ?? []) {
    const t = threads.get(m.wa_id);
    if (t) {
      t.count += 1;
      if (!t.name && m.contact_name) t.name = m.contact_name;
    } else {
      threads.set(m.wa_id, { waId: m.wa_id, name: m.contact_name, last: m.created_at, preview: m.body, direction: m.direction, count: 1 });
    }
  }
  const list = [...threads.values()];
  const active = selected && /^\d{6,20}$/.test(selected) ? selected : list[0]?.waId;

  if (list.length === 0) {
    return (
      <p className={styles.empty}>
        {configured
          ? "No WhatsApp messages yet. When someone messages your business number, the conversation shows up here."
          : "Connect your WhatsApp Business number under Setup first."}
      </p>
    );
  }

  return (
    <div className={styles.waLayout}>
      <ul className={styles.waList} aria-label="Conversations">
        {list.map((t) => (
          <li key={t.waId}>
            <Link
              href={`/admin/whatsapp?tab=messages&c=${t.waId}`}
              className={styles.waListItem}
              aria-current={t.waId === active ? "true" : undefined}
            >
              <span className={styles.waListName}>{t.name || `+${t.waId}`}</span>
              <span className={styles.kpiNote}>{timeFormat.format(new Date(t.last))}</span>
              <span className={styles.waListPreview}>
                {t.direction === "out" ? "You: " : ""}
                {t.preview}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {active ? <ActiveThread waId={active} /> : null}
    </div>
  );
}

async function ActiveThread({ waId }: { waId: string }) {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase
    .from("whatsapp_messages")
    .select("id, created_at, direction, kind, body, status, detail, contact_name")
    .eq("wa_id", waId)
    .order("created_at", { ascending: true })
    .limit(500);
  const messages = data ?? [];
  const name = [...messages].reverse().find((m) => m.contact_name)?.contact_name ?? "";
  const lastInbound = [...messages].reverse().find((m) => m.direction === "in")?.created_at ?? null;
  return <Thread waId={waId} name={name} messages={messages} replyOpen={withinReplyWindow(lastInbound)} />;
}

// WhatsApp allows free-text replies only within 24 hours of the person's last message.
function withinReplyWindow(lastInbound: string | null) {
  return lastInbound ? Date.now() - new Date(lastInbound).getTime() < 24 * 60 * 60 * 1000 : false;
}

function SetupSteps() {
  return (
    <section className={styles.card} aria-labelledby="wa-steps">
      <h2 id="wa-steps" className={styles.cardTitle}>
        Connecting your number
      </h2>
      <ol className={styles.stack} style={{ gap: "var(--space-3)", paddingLeft: "1.25rem", fontSize: "var(--text-small)" }}>
        <li>
          At{" "}
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener">
            developers.facebook.com/apps
          </a>
          , create an app of type <strong>Business</strong> and add the <strong>WhatsApp</strong> product.
        </li>
        <li>
          Under WhatsApp → API Setup, add your business phone number and verify it by SMS. The number can&apos;t be in use on the
          normal WhatsApp or WhatsApp Business app at the same time; use a separate number or move it across.
        </li>
        <li>Copy the <strong>Phone number ID</strong> and <strong>WhatsApp Business Account ID</strong> into the form.</li>
        <li>
          In Meta Business settings → Users → System users, create a system user, give it the app and the WhatsApp account, and
          generate a token that never expires with <code>whatsapp_business_messaging</code> and{" "}
          <code>whatsapp_business_management</code>. Paste it as the access token.
        </li>
        <li>From App settings → Basic, copy the <strong>App secret</strong>.</li>
        <li>Save, then add the webhook above in Meta and subscribe to <strong>messages</strong>.</li>
        <li>Press Check connection, send yourself a test, then switch WhatsApp on.</li>
        <li>
          Meta charges per conversation outside the free tier; replies within 24 hours of a customer&apos;s message are free.
          Add a payment method in WhatsApp Manager before going live.
        </li>
      </ol>
    </section>
  );
}
