"use client";

import { useSyncExternalStore } from "react";
import { MOTION_PAUSED_CLASS, MOTION_PAUSED_VALUE, MOTION_STORAGE_KEY } from "@/lib/motion-preference";

const CHANGE_EVENT = "motion-preference-change";

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
};
const isPaused = () => document.documentElement.classList.contains(MOTION_PAUSED_CLASS);

function savePreference(paused: boolean) {
  try {
    if (paused) localStorage.setItem(MOTION_STORAGE_KEY, MOTION_PAUSED_VALUE);
    else localStorage.removeItem(MOTION_STORAGE_KEY);
  } catch {
    // Storage blocked (private mode, policy): the choice still applies to this page.
  }
}

/**
 * Toggle button for the marquee headings. A constant label with aria-pressed (WAI-ARIA APG: a toggle
 * button's name must not change with its state). Rendered only with JavaScript; without it the button
 * could do nothing.
 */
export function MotionToggle({ label }: { label: string }) {
  const paused = useSyncExternalStore(subscribe, isPaused, () => false);

  const toggle = () => {
    document.documentElement.classList.toggle(MOTION_PAUSED_CLASS, !paused);
    savePreference(!paused);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <button type="button" aria-pressed={paused} onClick={toggle} className="motion-toggle hidden js:inline-flex">
      {label}
    </button>
  );
}
