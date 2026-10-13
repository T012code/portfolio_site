"use client";

import { useId, useMemo, useState } from "react";
import styles from "./analytics.module.css";

type Point = { date: string; visitors: number; views: number };

const W = 720;
const H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

const dayLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const fullLabel = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// Rounds the axis top up to a friendly number so gridlines land on whole values.
function niceMax(v: number) {
  if (v <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / step) * step;
}

/** Visitors (area) and page views (dashed line) per day, on one shared count axis. */
export function TrafficChart({ data }: { data: Point[] }) {
  const gradient = `fill-${useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState<number | null>(null);

  const { max, x, y, area, visitorsLine, viewsLine, ticks, labels } = useMemo(() => {
    const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.visitors, d.views))));
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
    const line = (key: "visitors" | "views") => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join("");
    const visitorsLine = line("visitors");
    const area = `${visitorsLine}L${x(data.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
    const every = Math.max(1, Math.ceil(data.length / 7));
    const labels = data.map((d, i) => ({ i, text: dayLabel.format(new Date(d.date)) })).filter(({ i }) => i % every === 0 || i === data.length - 1);
    return { max, x, y, area, visitorsLine, viewsLine: line("views"), ticks, labels };
  }, [data]);

  const active = hover !== null ? data[hover] : null;
  const slot = (W - PAD.left - PAD.right) / Math.max(1, data.length - 1);

  return (
    <div className={styles.chartWrap}>
      <ul className={styles.legend} aria-hidden="true">
        <li>
          <span className={styles.swatch} data-series="visitors" /> Visitors
        </li>
        <li>
          <span className={styles.swatch} data-series="views" /> Page views
        </li>
      </ul>
      <div className={styles.chart} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Visitors and page views per day, ${data.length} days. Peak ${max}.`}>
          <defs>
            <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className={styles.grid} />
              <text x={PAD.left - 8} y={y(t)} className={styles.axis} textAnchor="end" dominantBaseline="middle">
                {t}
              </text>
            </g>
          ))}
          {labels.map(({ i, text }) => (
            <text key={i} x={x(i)} y={H - 8} className={styles.axis} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}>
              {text}
            </text>
          ))}
          <path d={area} fill={`url(#${gradient})`} />
          <path d={viewsLine} className={styles.viewsLine} />
          <path d={visitorsLine} className={styles.visitorsLine} />
          {hover !== null ? (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} className={styles.crosshair} />
              <circle cx={x(hover)} cy={y(data[hover].views)} r={4} className={styles.dotViews} />
              <circle cx={x(hover)} cy={y(data[hover].visitors)} r={5} className={styles.dotVisitors} />
            </g>
          ) : null}
          {data.map((d, i) => (
            <rect
              key={d.date}
              x={x(i) - slot / 2}
              y={PAD.top}
              width={Math.max(slot, 4)}
              height={H - PAD.top - PAD.bottom}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
            />
          ))}
        </svg>
        {active && hover !== null ? (
          <div
            className={styles.tooltip}
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length * 0.7 ? "-100%" : hover < data.length * 0.3 ? "0" : "-50%"})` }}
          >
            <strong>{fullLabel.format(new Date(active.date))}</strong>
            <span>
              <span className={styles.swatch} data-series="visitors" /> {active.visitors} visitors
            </span>
            <span>
              <span className={styles.swatch} data-series="views" /> {active.views} page views
            </span>
          </div>
        ) : null}
      </div>
      <details className={styles.tableToggle}>
        <summary>Show as a table</summary>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Visitors</th>
                <th>Page views</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date}>
                  <td>{fullLabel.format(new Date(d.date))}</td>
                  <td>{d.visitors}</td>
                  <td>{d.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
