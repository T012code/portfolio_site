import { ImageResponse } from "next/og";
import { MARK_PATHS, MARK_VIEWBOX } from "@/components/brand/paths";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the mark in sky blue and lime on midnight.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1330" }}>
        <svg width="112" height="99" viewBox={MARK_VIEWBOX}>
          {MARK_PATHS.map((d, i) => (
            <path key={i} d={d} fill={i === 0 ? "#c7f25a" : "#7cc4ff"} />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
