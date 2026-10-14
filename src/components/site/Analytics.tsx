"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent";

const SESSION_KEY = "lv-session";

// Sends one beacon per page view (first load and every client-side navigation), only once the
// visitor has accepted visit counting in the cookie notice. No cookies: the tab keeps a random
// session id in sessionStorage so a visit's pages group together.
function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function Analytics() {
  const pathname = usePathname();
  const consent = useConsent();
  const allowed = consent?.analytics === true;
  const first = useRef(true);
  // Accepting on a page counts that page once, however often the choice is changed there.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    // Undefined while hydrating: the stored choice isn't read yet, so leave everything as it is.
    if (consent === undefined) return;
    if (!allowed) {
      // Not accepted, or withdrawn: drop the session id too.
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // Storage unavailable: there's no id to remove.
      }
      return;
    }
    // Automated browsers (tests, screenshots) are not visitors.
    if (navigator.webdriver || lastSent.current === pathname) return;
    const params = new URLSearchParams(window.location.search);
    // Wait a tick so the new page's <title> is in place.
    const timer = window.setTimeout(() => {
      const payload = JSON.stringify({
        path: pathname,
        title: document.title,
        referrer: first.current ? document.referrer : "",
        utm: params.get("utm_source") ?? params.get("ref") ?? "",
        session: sessionId(),
        consent: true,
      });
      first.current = false;
      lastSent.current = pathname;
      const blob = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/collect", blob)) {
        void fetch("/api/collect", { method: "POST", body: payload, keepalive: true, headers: { "content-type": "application/json" } });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [pathname, allowed, consent]);

  return null;
}
