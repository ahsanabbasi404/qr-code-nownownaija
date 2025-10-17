// app/qr/[slug]/redirect-client.tsx
"use client";

import { useEffect } from "react";

export default function AutoRedirect({
  targetUrl,
  token,
}: {
  targetUrl: string;
  token: string | null;
}) {
  useEffect(() => {
    const url = "/api/qr/track";

    const send = () => {
      // No token? Skip tracking but still redirect.
      if (!token) return Promise.resolve();

      try {
        if ("sendBeacon" in navigator) {
          const data = new Blob([JSON.stringify({ t: token })], {
            type: "application/json",
          });
          // sendBeacon returns boolean; wrap to always resolve
          navigator.sendBeacon(url, data);
          return Promise.resolve();
        }
      } catch {
        // fall through to fetch
      }

      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token }),
        keepalive: true,
        cache: "no-store",
        credentials: "same-origin",
      }).catch(() => undefined);
    };

    // Fire-and-go; ALWAYS redirect even if tracking fails
    send().finally(() => {
      const go = () => {
        try {
          window.location.replace(targetUrl); // avoids extra history entry
        } catch {
          window.location.href = targetUrl;
        }
      };
      setTimeout(go, 35); // tiny delay helps the beacon leave the page
    });
  }, [targetUrl, token]);

  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <p className="text-sm text-gray-500">Opening…</p>
      <noscript>
        JavaScript required to continue. <a href={targetUrl}>Click here</a>.
      </noscript>
    </main>
  );
}
