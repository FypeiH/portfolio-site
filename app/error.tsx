"use client";

import Link from "next/link";
import { useEffect } from "react";
import { errorCopy } from "@/lib/content/error-copy";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-24 md:px-8">
      <title>{errorCopy.metaTitle}</title>
      <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{errorCopy.title}</h1>
      <p className="mt-4 text-muted">{errorCopy.body}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-bg hover:bg-accent-strong">
          {errorCopy.retry}
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md border border-border px-5 text-sm font-medium hover:border-accent hover:text-accent">
          {errorCopy.home}
        </Link>
      </div>
    </div>
  );
}
