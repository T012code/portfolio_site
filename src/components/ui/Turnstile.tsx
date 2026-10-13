"use client";

import { useEffect, useEffectEvent, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
    script.onerror = () => {
      loading = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Cloudflare Turnstile check. Tokens are single use, so remount it (change its `key`)
 * after every attempt to get a fresh one. `quiet` keeps the box hidden unless Cloudflare
 * needs the visitor to tick it.
 */
export function Turnstile({
  siteKey,
  action,
  onToken,
  onError,
  quiet = false,
}: {
  siteKey: string;
  action: string;
  onToken: (token: string | null) => void;
  onError: () => void;
  quiet?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const token = useEffectEvent((value: string | null) => onToken(value));
  const failed = useEffectEvent(() => onError());

  useEffect(() => {
    let id: string | null = null;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !ref.current) return;
        id = api.render(ref.current, {
          sitekey: siteKey,
          action,
          theme: "auto",
          size: "flexible",
          appearance: quiet ? "interaction-only" : "always",
          callback: (t: string) => token(t),
          "expired-callback": () => token(null),
          "error-callback": () => {
            token(null);
            failed();
          },
        });
      })
      .catch(() => failed());
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey, action, quiet]);

  return <div ref={ref} style={quiet ? undefined : { minHeight: 65 }} />;
}
