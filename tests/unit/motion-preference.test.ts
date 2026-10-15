import { describe, expect, it } from "vitest";
import { APPLY_MOTION_PREFERENCE_JS, MOTION_PAUSED_CLASS, MOTION_PAUSED_VALUE, MOTION_STORAGE_KEY } from "@/lib/motion-preference";

/** Runs the inline pre-paint script against a fake <html> and storage. */
function runScript(storage: { getItem(key: string): string | null }) {
  const classes = new Set<string>();
  const document = { documentElement: { classList: { add: (name: string) => classes.add(name) } } };
  new Function("document", "localStorage", APPLY_MOTION_PREFERENCE_JS)(document, storage);
  return classes;
}

describe("motion preference pre-paint script", () => {
  it("pauses the marquees when the saved choice is paused", () => {
    expect(runScript({ getItem: (key) => (key === MOTION_STORAGE_KEY ? MOTION_PAUSED_VALUE : null) })).toEqual(new Set([MOTION_PAUSED_CLASS]));
  });

  it("leaves motion on without a saved choice", () => {
    expect(runScript({ getItem: () => null }).size).toBe(0);
  });

  it("never throws when storage is blocked", () => {
    const blocked = { getItem: (): string | null => { throw new DOMException("denied", "SecurityError"); } };
    expect(() => runScript(blocked)).not.toThrow();
  });
});
