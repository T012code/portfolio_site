import Link from "next/link";
import { TrafficChart } from "./TrafficChart";
import admin from "../../admin.module.css";
import styles from "./analytics.module.css";

type Row = Record<string, string | number | null>;
export type Summary = {
  days: number;
  totals: { visitors: number; views: number; visits: number; bounce_rate: number; views_per_visit: number };
  previous: { visitors: number; views: number; visits: number };
  reach: { live: number; day: number; week: number; month: number; quarter: number; all: number };
  daily: { date: string; visitors: number; views: number }[];
  countries: { code: string; visitors: number; views: number }[];
  cities: { city: string; code: string | null; visitors: number }[];
  pages: { path: string; views: number; visitors: number }[];
  referrers: { source: string; visitors: number }[];
  devices: { name: string; visitors: number }[];
  browsers: { name: string; visitors: number }[];
  systems: { name: string; visitors: number }[];
  recent: (Row & { last_seen: string; total_views: number })[];
};

export const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
];

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });
const number = new Intl.NumberFormat("en-GB");

function countryName(code: string | null) {
  if (!code || code === "??") return "Unknown";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

// Regional-indicator letters render as the country's flag on most systems.
function flag(code: string | null) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function change(now: number, before: number) {
  if (before === 0) return now === 0 ? null : { text: "New", up: true };
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

function Bars({ rows, label, value, total }: { rows: { key: string; label: React.ReactNode; value: number }[]; label: string; value: string; total: number }) {
  if (rows.length === 0) return <p className={admin.muted}>No data in this period yet.</p>;
  return (
    <table className={styles.bars}>
      <thead className="visually-hidden">
        <tr>
          <th>{label}</th>
          <th>{value}</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const share = total > 0 ? Math.round((r.value / total) * 100) : 0;
          return (
            <tr key={r.key}>
              <td>
                <span className={styles.barFill} style={{ transform: `scaleX(${total > 0 ? r.value / total : 0})` }} aria-hidden="true" />
                <span className={styles.barLabel}>{r.label}</span>
              </td>
              <td className={styles.barValue}>{number.format(r.value)}</td>
              <td className={styles.barShare}>{share}%</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function AnalyticsView({ s, days }: { s: Summary; days: number }) {
  const t = s.totals;
  const kpis = [
    { label: "Visitors", value: number.format(t.visitors), delta: change(t.visitors, s.previous.visitors), hint: "Unique people" },
    { label: "Page views", value: number.format(t.views), delta: change(t.views, s.previous.views), hint: "Every page opened" },
    { label: "Visits", value: number.format(t.visits), delta: change(t.visits, s.previous.visits), hint: "Separate sessions" },
    { label: "Pages per visit", value: String(t.views_per_visit), delta: null, hint: "Average depth" },
    { label: "Bounce rate", value: `${t.bounce_rate}%`, delta: null, hint: "Visits with one page" },
  ];
  const reach = [
    { label: "Right now", value: s.reach.live, live: true },
    { label: "Last 24 hours", value: s.reach.day },
    { label: "Last 7 days", value: s.reach.week },
    { label: "Last 30 days", value: s.reach.month },
    { label: "Last 90 days", value: s.reach.quarter },
    { label: "All time", value: s.reach.all },
  ];
  const deviceTotal = s.devices.reduce((n, d) => n + d.visitors, 0);
  const sum = (rows: { visitors: number }[]) => rows.reduce((n, r) => n + r.visitors, 0);

  return (
    <>
      <header className={admin.pageHead}>
        <div>
          <h1 className={admin.pageTitle}>Analytics</h1>
          <p className={admin.pageIntro}>
            Who visits the site and from where. Your own visits while signed in, and bots, are not counted.
          </p>
        </div>
        <nav aria-label="Date range" className={styles.ranges}>
          {RANGES.map((r) => (
            <Link key={r.days} href={`/admin/analytics?range=${r.days}`} aria-current={r.days === days ? "page" : undefined}>
              {r.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className={styles.page}>
        <section aria-labelledby="reach-heading">
          <h2 id="reach-heading" className="label">
            Reach: unique visitors
          </h2>
          <ul className={styles.reach}>
            {reach.map((r) => (
              <li key={r.label} data-live={r.live || undefined}>
                <span className={styles.reachLabel}>
                  {r.live ? <span className={styles.pulse} aria-hidden="true" /> : null}
                  {r.label}
                </span>
                <span className={styles.reachValue}>{number.format(r.value)}</span>
              </li>
            ))}
          </ul>
        </section>

        <ul className={styles.kpis} aria-label={`Totals for the last ${days} days`}>
          {kpis.map((k) => (
            <li key={k.label} className={styles.kpi}>
              <span className={styles.kpiLabel}>{k.label}</span>
              <span className={styles.kpiValue}>{k.value}</span>
              <span className={styles.kpiFoot}>
                {k.delta ? (
                  <span className={styles.delta} data-up={k.delta.up || undefined}>
                    {k.delta.up ? "▲" : "▼"} {k.delta.text}
                    <span className="visually-hidden"> versus the previous {days} days</span>
                  </span>
                ) : null}
                <span>{k.hint}</span>
              </span>
            </li>
          ))}
        </ul>

        <section className={styles.card} aria-labelledby="traffic-heading">
          <div className={styles.cardHead}>
            <h2 id="traffic-heading" className={styles.cardTitle}>
              Traffic, last {days} days
            </h2>
          </div>
          <TrafficChart data={s.daily} />
        </section>

        <div className={styles.split}>
          <section className={styles.card} aria-labelledby="countries-heading">
            <div className={styles.cardHead}>
              <h2 id="countries-heading" className={styles.cardTitle}>
                Countries
              </h2>
              <span className={admin.muted}>{s.countries.length} in this period</span>
            </div>
            <Bars
              label="Country"
              value="Visitors"
              total={sum(s.countries)}
              rows={s.countries.map((c) => ({
                key: c.code,
                value: c.visitors,
                label: (
                  <>
                    <span className={styles.flag} aria-hidden="true">
                      {flag(c.code)}
                    </span>
                    {countryName(c.code)}
                  </>
                ),
              }))}
            />
          </section>

          <section className={styles.card} aria-labelledby="recent-heading">
            <div className={styles.cardHead}>
              <h2 id="recent-heading" className={styles.cardTitle}>
                Last 5 visitors
              </h2>
              <span className={admin.muted}>IPs are cleared after 90 days</span>
            </div>
            {s.recent.length === 0 ? (
              <p className={admin.muted}>No visits recorded yet.</p>
            ) : (
              <ul className={styles.visitors}>
                {s.recent.map((v) => (
                  <li key={String(v.visitor_id)}>
                    <span className={styles.visitorFlag} aria-hidden="true">
                      {flag(v.code as string | null)}
                    </span>
                    <span className={styles.visitorMain}>
                      <strong className={styles.ip}>{v.ip ?? "IP cleared"}</strong>
                      <span>
                        {[v.city, v.region, countryName(v.code as string | null)].filter(Boolean).join(", ")}
                      </span>
                      <span className={admin.muted}>
                        {v.device} · {v.browser} on {v.os}
                        {v.referrer_host ? ` · from ${v.referrer_host}` : ""}
                      </span>
                    </span>
                    <span className={styles.visitorMeta}>
                      <span>{timeFormat.format(new Date(v.last_seen))}</span>
                      <code>{v.path}</code>
                      <span className={admin.muted}>
                        {v.total_views} {Number(v.total_views) === 1 ? "view" : "views"} in total
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className={styles.split}>
          <section className={styles.card} aria-labelledby="pages-heading">
            <div className={styles.cardHead}>
              <h2 id="pages-heading" className={styles.cardTitle}>
                Top pages
              </h2>
              <span className={admin.muted}>by page views</span>
            </div>
            <Bars
              label="Page"
              value="Views"
              total={s.pages.reduce((n, p) => n + p.views, 0)}
              rows={s.pages.map((p) => ({ key: p.path, value: p.views, label: <code>{p.path}</code> }))}
            />
          </section>

          <section className={styles.card} aria-labelledby="sources-heading">
            <div className={styles.cardHead}>
              <h2 id="sources-heading" className={styles.cardTitle}>
                Where visitors came from
              </h2>
            </div>
            <Bars
              label="Source"
              value="Visitors"
              total={sum(s.referrers)}
              rows={s.referrers.map((r) => ({ key: r.source, value: r.visitors, label: r.source }))}
            />
          </section>
        </div>

        <div className={styles.quad}>
          <section className={styles.card} aria-labelledby="devices-heading">
            <h2 id="devices-heading" className={styles.cardTitle}>
              Devices
            </h2>
            {deviceTotal > 0 ? (
              <>
                <div className={styles.stack} aria-hidden="true">
                  {s.devices.map((d) => (
                    <span key={d.name} data-device={d.name} style={{ flexGrow: d.visitors }} />
                  ))}
                </div>
                <ul className={styles.stackLegend}>
                  {s.devices.map((d) => (
                    <li key={d.name}>
                      <span className={styles.swatch} data-device={d.name} />
                      <span className={styles.cap}>{d.name}</span>
                      <strong>{Math.round((d.visitors / deviceTotal) * 100)}%</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={admin.muted}>No data yet.</p>
            )}
          </section>

          <section className={styles.card} aria-labelledby="browsers-heading">
            <h2 id="browsers-heading" className={styles.cardTitle}>
              Browsers
            </h2>
            <Bars label="Browser" value="Visitors" total={sum(s.browsers)} rows={s.browsers.map((b) => ({ key: b.name, value: b.visitors, label: b.name }))} />
          </section>

          <section className={styles.card} aria-labelledby="os-heading">
            <h2 id="os-heading" className={styles.cardTitle}>
              Operating systems
            </h2>
            <Bars label="System" value="Visitors" total={sum(s.systems)} rows={s.systems.map((o) => ({ key: o.name, value: o.visitors, label: o.name }))} />
          </section>

          <section className={styles.card} aria-labelledby="cities-heading">
            <h2 id="cities-heading" className={styles.cardTitle}>
              Top cities
            </h2>
            <Bars
              label="City"
              value="Visitors"
              total={sum(s.cities)}
              rows={s.cities.map((c) => ({
                key: `${c.city}-${c.code}`,
                value: c.visitors,
                label: (
                  <>
                    <span className={styles.flag} aria-hidden="true">
                      {flag(c.code)}
                    </span>
                    {c.city}
                  </>
                ),
              }))}
            />
          </section>
        </div>
      </div>
    </>
  );
}
