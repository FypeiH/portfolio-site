/** The visitor's "pause animations" choice (WCAG 2.2.2): a class on <html>, persisted in localStorage. */
export const MOTION_PAUSED_CLASS = "motion-paused";
export const MOTION_STORAGE_KEY = "motion";
export const MOTION_PAUSED_VALUE = "paused";

/** Inline, before first paint (app/layout.tsx), so a saved choice never shows a moving frame. */
export const APPLY_MOTION_PREFERENCE_JS =
  `try{if(localStorage.getItem(${JSON.stringify(MOTION_STORAGE_KEY)})===${JSON.stringify(MOTION_PAUSED_VALUE)})` +
  `document.documentElement.classList.add(${JSON.stringify(MOTION_PAUSED_CLASS)})}catch(e){}`;
