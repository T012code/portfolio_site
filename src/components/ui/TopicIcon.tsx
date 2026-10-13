import {
  BrowsersIcon,
  CodeIcon,
  CpuIcon,
  DeviceMobileIcon,
  FileTextIcon,
  GaugeIcon,
  HandshakeIcon,
  LightbulbIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  PlugsConnectedIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  StackIcon,
  WrenchIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { createElement } from "react";

// Picks a Phosphor icon from the words in a capability, service or process step title,
// so admin-edited titles still get a fitting icon.
const RULES: [RegExp, Icon][] = [
  [/mobile|app developer|flutter|ios|android/i, DeviceMobileIcon],
  [/integrat|api|payment|crm/i, PlugsConnectedIcon],
  [/full.?stack|web app/i, StackIcon],
  [/front.?end|interface|\bui\b/i, PaintBrushIcon],
  [/wordpress|web developer|theme|plugin/i, BrowsersIcon],
  [/consult|strategy|advice/i, LightbulbIcon],
  [/hardware|network|device/i, CpuIcon],
  [/launch|ship|deploy/i, RocketLaunchIcon],
  [/security|maintenance|support/i, ShieldCheckIcon],
  [/review|scal|performance/i, GaugeIcon],
  [/discover|research|audit/i, MagnifyingGlassIcon],
  [/proposal|plan|scope/i, FileTextIcon],
  [/build|develop/i, WrenchIcon],
  [/agree|contract|partner/i, HandshakeIcon],
];

export function topicIcon(title: string): Icon {
  return RULES.find(([re]) => re.test(title))?.[1] ?? CodeIcon;
}

export function TopicIcon({ title, size = 22 }: { title: string; size?: number }) {
  // Picked from a static table, not created here; createElement keeps the lint rule satisfied.
  return createElement(topicIcon(title), { size, weight: "duotone", "aria-hidden": true });
}
