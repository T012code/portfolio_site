import { ImageResponse } from "next/og";
import { MARK_PATHS, MARK_VIEWBOX } from "@/components/brand/paths";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the white mark with its lime square on cobalt, matching the favicon.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2f5bff" }}>
        <svg width="112" height="99" viewBox={MARK_VIEWBOX}>
          {MARK_PATHS.map((d, i) => (
            <path key={i} d={d} fill={i === 0 ? "#c7f25a" : "#ffffff"} />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
