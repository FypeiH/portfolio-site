"use client";

import { useEffect, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

interface CopyEmailButtonProps {
  email: string;
  labels: { copy: string; copyAria: string; copied: string; failed: string };
}

const RESET_AFTER_MS = 2000;

export function CopyEmailButton({ email, labels }: CopyEmailButtonProps) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), RESET_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <span className="hidden items-center gap-3 js:inline-flex">
      <button
        type="button"
        onClick={copy}
        aria-label={labels.copyAria}
        className="ui-btn ui-btn-outline min-w-11"
      >
        {labels.copy}
      </button>
      <span
        aria-live="polite"
        className="font-mono text-sm text-success transition-opacity duration-200 motion-reduce:transition-none data-[state=failed]:text-muted data-[state=idle]:opacity-0"
        data-state={state}
      >
        {state === "copied" && labels.copied}
        {state === "failed" && labels.failed}
      </span>
    </span>
  );
}
