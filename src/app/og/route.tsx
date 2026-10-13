import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { MARK_PATHS, MARK_VIEWBOX } from "@/components/brand/paths";
import { getSettings } from "@/lib/content";
import { mediaUrl } from "@/lib/media";

// Social share card (1200×630) for every page: /og?title=...&kicker=...
// Colours mirror the site tokens (Satori has no CSS variables, so they're written out here).
const NAVY = "#0b1330";
const COBALT = "#2f5bff";
const SKY = "#7cc4ff";
const LIME = "#c7f25a";
const INK = "#eef3ff";
const MUTED = "#a9b6d8";

async function portraitData(path: string | null) {
  const url = mediaUrl(path);
  if (!url) return null;
  try {
    if (url.startsWith("/")) {
      const file = await readFile(join(process.cwd(), "public", url));
      return `data:image/jpeg;base64,${file.toString("base64")}`;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const settings = await getSettings();
  const title = (params.get("title") || settings.seo_title || settings.display_name).slice(0, 90);
  const kicker = (params.get("kicker") || settings.motto).slice(0, 40);
  const [bold, regular, portrait] = await Promise.all([
    readFile(join(process.cwd(), "assets/og/Archivo-Bold.ttf")),
    readFile(join(process.cwd(), "assets/og/Archivo-Regular.ttf")),
    portraitData(settings.portrait_path),
  ]);

  const words = title.trim().split(/\s+/);
  const lead = words.slice(0, -1).join(" ");
  const last = words[words.length - 1];
  const size = title.length > 60 ? 60 : title.length > 36 ? 72 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: NAVY,
          color: INK,
          fontFamily: "Archivo",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            background: `radial-gradient(circle at 82% 8%, rgba(47,91,255,0.85) 0%, rgba(47,91,255,0) 48%)`,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 60px 72px", width: portrait ? 800 : 1056 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="56" height="50" viewBox={MARK_VIEWBOX}>
              {MARK_PATHS.map((d, i) => (
                <path key={i} d={d} fill={i === 0 ? LIME : SKY} />
              ))}
            </svg>
            <div
              style={{
                display: "flex",
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(199,242,90,0.14)",
                color: LIME,
                fontSize: 24,
                fontWeight: 400,
                letterSpacing: 1,
              }}
            >
              {kicker}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", fontSize: size, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2.5 }}>
            {lead ? <span style={{ marginRight: size * 0.25 }}>{lead}</span> : null}
            <span style={{ color: LIME }}>{last}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 700 }}>{settings.full_name}</span>
            <span style={{ fontSize: 24, color: MUTED }}>layothedeveloper.com · {settings.location}</span>
          </div>
        </div>
        {portrait ? (
          <div style={{ display: "flex", alignItems: "flex-end", padding: "72px 64px 0 0" }}>
            <div
              style={{
                display: "flex",
                width: 300,
                height: 520,
                borderRadius: "150px 150px 0 0",
                overflow: "hidden",
                background: `linear-gradient(170deg, ${SKY}, ${COBALT})`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>. */}
              <img src={portrait} alt="" width={300} height={520} style={{ objectFit: "cover", objectPosition: "50% 20%" }} />
            </div>
          </div>
        ) : null}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Archivo", data: bold, weight: 700, style: "normal" },
        { name: "Archivo", data: regular, weight: 400, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" },
    },
  );
}
