"use client";

import { openConsent } from "@/lib/consent";

/** Reopens the cookie notice, so a choice can be changed or withdrawn as easily as it was made. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={openConsent}>
      Cookie settings
    </button>
  );
}
