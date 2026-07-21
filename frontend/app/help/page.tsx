"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, HelpCircle } from "lucide-react";

type FaqItem = { q: string; a: React.ReactNode };

const FAQS: FaqItem[] = [
  {
    q: "How do I install AirIntel on my phone or computer?",
    a: (
      <>
        <p>
          If you see an "Install AirIntel" banner on the dashboard, tapping
          it is the fastest way. If you don't see it (or dismissed it
          already), every browser also lets you install manually:
        </p>
        <p className="mt-2 font-medium text-ink">Chrome / Edge (desktop)</p>
        <p className="mt-1">
          Look for a small install icon at the right side of the address
          bar (a monitor with a down-arrow), or open the ⋮ menu → "Install
          AirIntel…" / "Apps → Install this site as an app."
        </p>
        <p className="mt-2 font-medium text-ink">Chrome (Android)</p>
        <p className="mt-1">
          Tap the ⋮ menu → "Install app" or "Add to Home screen."
        </p>
        <p className="mt-2 font-medium text-ink">Safari (iPhone/iPad)</p>
        <p className="mt-1">
          There's no install banner on iOS at all — Safari doesn't support
          it. Tap the Share icon → "Add to Home Screen." This step also
          matters for push notifications, not just convenience — see the
          next question.
        </p>
      </>
    ),
  },
  {
    q: "I clicked \"Enable push alerts\" but nothing happened",
    a: (
      <>
        <p>
          This almost always means your browser already made a decision about
          notifications for this site before — usually "Block," from an
          earlier visit — and once a browser has denied permission, no
          website can ever re-trigger that prompt with code. The button
          isn't broken; there's just nothing left for it to ask.
        </p>
        <p className="mt-2">Fix it directly in the browser instead:</p>
        <p className="mt-2 font-medium text-ink">Chrome / Edge (desktop)</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          <li>
            Click the icon just left of the address bar (a lock, or a small
            slider/tune icon, depending on your Chrome version).
          </li>
          <li>
            Find <strong>Notifications</strong> in that panel — it'll show
            "Block" if that's what happened. Change it to{" "}
            <strong>Allow</strong>.
          </li>
          <li>Reload the page and try "Enable push alerts" again.</li>
        </ol>
        <p className="mt-2 font-medium text-ink">Safari</p>
        <p className="mt-1">
          Safari doesn't put this in the address bar. On a Mac: Safari →
          Settings → Websites → Notifications, find this site, set it to
          Allow. On iPhone/iPad, see the next question first — Safari won't
          offer push at all unless the app is installed to your Home Screen.
        </p>
      </>
    ),
  },
  {
    q: "I'm on my iPhone and never get a permission prompt at all",
    a: (
      <p>
        This is an Apple platform rule, not something this app can work
        around: push notifications only work in Safari on iOS 16.4 or
        later, and only after you've added this site to your{" "}
        <strong>Home Screen</strong> (Share button → "Add to Home Screen")
        and opened it from that icon — a regular Safari tab, no matter how
        long it stays open, can never receive push notifications on iOS.
        Once it's added to your Home Screen and opened from there, "Enable
        push alerts" will work the same as on any other browser.
      </p>
    ),
  },
  {
    q: "The header shows \"Alerts blocked\" — what do I do?",
    a: (
      <p>
        Same underlying cause as above — your browser has notifications set
        to "Block" for this site specifically. Follow the Chrome/Safari
        steps in the first answer to switch it back to "Allow," then reload.
      </p>
    ),
  },
  {
    q: "How does Telegram linking work?",
    a: (
      <>
        <p>
          Tap <strong>Link Telegram</strong> in the dashboard header — it
          opens Telegram with a message already filled in. You just need to
          tap <strong>Send</strong> on that message; the bot pairs your
          account automatically from there.
        </p>
        <p className="mt-2">
          If it doesn't pair: make sure Telegram actually opened and that
          you sent the pre-filled message rather than closing the app. Pairing
          links can also expire if you wait too long before sending it —
          if that happens, just come back to the dashboard and tap "Link
          Telegram" again for a fresh one.
        </p>
      </>
    ),
  },
  {
    q: "I don't want Telegram alerts anymore — how do I turn them off?",
    a: (
      <p>
        Each pinned location has its own Telegram toggle on its card — turn
        that off per location without unlinking your account entirely. If
        you want to stop hearing from the bot altogether, blocking it inside
        Telegram works too; your account stays linked, it just won't be able
        to message you.
      </p>
    ),
  },
  {
    q: "Why didn't I get an alert the moment conditions crossed my threshold?",
    a: (
      <p>
        Alerts are checked on a schedule, not the instant a reading changes —
        so there can be a short delay between conditions crossing your
        threshold and a push actually arriving. This is expected; it's not
        a live stream, it's a periodic check.
      </p>
    ),
  },
  {
    q: "Why does the app ask for my location?",
    a: (
      <p>
        Only to find your nearest monitoring station for the "Current
        location" card — it's a one-off read each time you open the
        dashboard or refresh, not continuous background tracking. Pinned
        locations (Home, Office, etc.) are checked from their saved
        coordinates instead, which is why alerts for those still work even
        if you never grant location access at all.
      </p>
    ),
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-haze-400 hover:text-ink">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="instrument-label">Help</p>
          <h1 className="font-display text-2xl text-ink">Frequently asked questions</h1>
        </div>
      </div>

      <div className="space-y-2">
        {FAQS.map((item, i) => (
          <div
            key={i}
            className="rounded-instrument border border-haze-50 bg-panelRaised shadow-instrument"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <span className="flex items-center gap-2 font-display text-sm text-ink">
                <HelpCircle size={15} className="shrink-0 text-brand" />
                {item.q}
              </span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-haze-200 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <div className="border-t border-haze-50 px-4 py-3 text-sm text-haze-400">{item.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
