import { CreditCardIcon, CubeIcon, RocketLaunchIcon, ShieldCheckIcon, WindowsLogoIcon } from "@phosphor-icons/react/ssr";
import type { ComponentType, SVGProps } from "react";
import {
  SiAnthropic,
  SiCloudflare,
  SiDart,
  SiFigma,
  SiFlutter,
  SiGit,
  SiGithub,
  SiHubspot,
  SiJavascript,
  SiMysql,
  SiNextdotjs,
  SiNodedotjs,
  SiPhp,
  SiReact,
  SiStripe,
  SiSupabase,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
  SiWhatsapp,
  SiWoocommerce,
  SiWordpress,
  SiZoho,
} from "react-icons/si";

type Glyph = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

// Brand marks from Simple Icons (CC0) via react-icons; Phosphor stands in where no mark exists.
// `hue` is the brand colour shown on hover; marks rest in the current text colour.
const BRANDS: Record<string, { icon: Glyph; hue: string }> = {
  php: { icon: SiPhp, hue: "#777BB4" },
  javascript: { icon: SiJavascript, hue: "#E8C400" },
  typescript: { icon: SiTypescript, hue: "#3178C6" },
  react: { icon: SiReact, hue: "#2FB8D8" },
  "react native": { icon: SiReact, hue: "#2FB8D8" },
  "next.js": { icon: SiNextdotjs, hue: "currentColor" },
  "node.js": { icon: SiNodedotjs, hue: "#5FA04E" },
  mysql: { icon: SiMysql, hue: "#4479A1" },
  supabase: { icon: SiSupabase, hue: "#3ECF8E" },
  wordpress: { icon: SiWordpress, hue: "#21759B" },
  woocommerce: { icon: SiWoocommerce, hue: "#96588A" },
  flutter: { icon: SiFlutter, hue: "#02569B" },
  dart: { icon: SiDart, hue: "#0175C2" },
  stripe: { icon: SiStripe, hue: "#635BFF" },
  paystack: { icon: CreditCardIcon as Glyph, hue: "#0BA4DB" },
  git: { icon: SiGit, hue: "#F05032" },
  github: { icon: SiGithub, hue: "currentColor" },
  zoho: { icon: SiZoho, hue: "#E42527" },
  cloudflare: { icon: SiCloudflare, hue: "#F38020" },
  hubspot: { icon: SiHubspot, hue: "#FF7A59" },
  "hubspot api": { icon: SiHubspot, hue: "#FF7A59" },
  figma: { icon: SiFigma, hue: "#F24E1E" },
  vercel: { icon: SiVercel, hue: "currentColor" },
  tailwind: { icon: SiTailwindcss, hue: "#06B6D4" },
  "whatsapp api": { icon: SiWhatsapp, hue: "#25D366" },
  claude: { icon: SiAnthropic, hue: "#D97757" },
  "microsoft 365": { icon: WindowsLogoIcon as Glyph, hue: "#0078D4" },
  antigravity: { icon: RocketLaunchIcon as Glyph, hue: "#4285F4" },
  "security audits": { icon: ShieldCheckIcon as Glyph, hue: "currentColor" },
};

export function techBrand(name: string) {
  return BRANDS[name.trim().toLowerCase()] ?? { icon: CubeIcon as Glyph, hue: "currentColor" };
}

export function TechIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const { icon: Glyph, hue } = techBrand(name);
  return (
    <Glyph
      size={size}
      className={className}
      aria-hidden="true"
      focusable="false"
      style={{ "--brand": hue } as React.CSSProperties}
    />
  );
}
