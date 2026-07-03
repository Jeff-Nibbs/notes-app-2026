"use client";

import { useEffect } from "react";

// Minimal service worker registration — only for PWA installability.
// The app is online-only by design (spec §1).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a nice-to-have; ignore registration failures.
      });
    }
  }, []);
  return null;
}
