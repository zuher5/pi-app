"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Pi-App browser pairing. The QR printed by `pi-app` opens `/pair#t=<token>`;
 * the token stays in the fragment (never sent in a URL to the server or kept in
 * history), is traded for a session cookie, and the browser lands on pi-web.
 */
export default function PairPage() {
  const [state, setState] = useState<"pairing" | "missing" | "failed">("pairing");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("t");
    window.history.replaceState(null, "", "/pair");
    if (!token) { setState("missing"); return; }
    void (async () => {
      try {
        const response = await fetch("/api/pi-app/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (response.ok) { window.location.replace("/"); return; }
        const seconds = Number(response.headers.get("retry-after"));
        setDetail(response.status === 401
          ? "This pairing code is no longer valid. Run `pi-app pair` on the computer and scan the new QR."
          : response.status === 429
            ? `Too many attempts. Try again in ${Number.isFinite(seconds) && seconds > 0 ? seconds : 1} s.`
            : "The server refused the pairing.");
        setState("failed");
      } catch {
        setDetail("Could not reach the server.");
        setState("failed");
      }
    })();
  }, []);

  return (
    <main className="web-login-page">
      <div className="web-login-shell">
        <header className="web-login-brand">
          <Image src="/icons/apple-touch-icon.png" width={52} height={52} alt="" priority />
          <div>
            <h1>Pi-App</h1>
            <p role="status" aria-live="polite">
              {state === "pairing" ? "Pairing this browser…"
                : state === "missing" ? "Scan the QR code that pi-app printed on your computer."
                : detail}
            </p>
          </div>
        </header>
        {state !== "pairing" && <p className="web-login-error"><a href="/login">Sign in with a password instead</a></p>}
      </div>
    </main>
  );
}
