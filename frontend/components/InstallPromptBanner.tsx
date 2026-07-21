"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "airintel:install-banner-dismissed";

/**
 * Chrome/Edge/Android fire `beforeinstallprompt` when the site meets
 * installability criteria (valid manifest, service worker, HTTPS) — but
 * only if you capture and hold onto that event yourself; the browser
 * won't show its own UI for it unless you never call preventDefault().
 * Capturing it lets us show our own styled button instead of relying on
 * people noticing a small icon in the address bar.
 *
 * iOS Safari never fires this event at all — there is no JS-level
 * install prompt on iOS, full stop. That's covered as a manual "Add to
 * Home Screen" nudge in the Help page instead, not here.
 */
export default function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(true); // default hidden until we know better

  useEffect(() => {
    // Already installed (running standalone) — nothing to prompt.
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setDismissed(false);
    }
    window.addEventListener("beforeinstallprompt", handlePrompt);

    function handleInstalled() {
      setDismissed(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice; // resolves regardless of accept/dismiss
    setDeferredPrompt(null);
    setDismissed(true);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (dismissed || !deferredPrompt) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-instrument border border-brand/30 bg-panelSunken px-4 py-3">
      <div className="flex items-center gap-2">
        <Download size={16} className="text-brand" />
        <p className="text-sm text-ink">Install AirIntel for one-tap access from your home screen.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={install}
          className="rounded-instrument bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
        >
          Install
        </button>
        <button onClick={dismiss} className="p-1 text-haze-200 hover:text-ink" aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
