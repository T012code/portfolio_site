"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Sends one beacon per page view (first load and every client-side navigation).
// No cookies: the tab keeps a random session id in sessionStorage so a visit's pages group together.
function sessionId() {
  try {
    let id = sessionStorage.getItem("lv-session");
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem("lv-session", id);
    }
    return id;
  } catch {
    return null;
  }
}

export function Analytics() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // Automated browsers (tests, screenshots) are not visitors.
    if (navigator.webdriver) return;
    const params = new URLSearchParams(window.location.search);
    // Wait a tick so the new page's <title> is in place.
    const timer = window.setTimeout(() => {
      const payload = JSON.stringify({
        path: pathname,
        title: document.title,
        referrer: first.current ? document.referrer : "",
        utm: params.get("utm_source") ?? params.get("ref") ?? "",
        session: sessionId(),
      });
      first.current = false;
      const blob = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/collect", blob)) {
        void fetch("/api/collect", { method: "POST", body: payload, keepalive: true, headers: { "content-type": "application/json" } });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}
