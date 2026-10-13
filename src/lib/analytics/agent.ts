// Small user-agent reader for analytics: device class, browser and OS family, and bots.
// Deliberately coarse: the dashboard groups by family, not by version.

const BOT = /bot|crawl|spider|slurp|preview|fetch|monitor|headless|lighthouse|pagespeed|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|python|axios|node-fetch|go-http|java\//i;

export function isBot(ua: string) {
  return ua === "" || BOT.test(ua);
}

export function device(ua: string): "desktop" | "mobile" | "tablet" {
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

export function browser(ua: string) {
  if (/edg(e|a|ios)?\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios|chromium/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

export function os(ua: string) {
  if (/windows/i.test(ua)) return "Windows";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/cros/i.test(ua)) return "ChromeOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}
