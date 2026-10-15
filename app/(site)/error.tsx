"use client";

import Link from "next/link";
import { useEffect } from "react";
import { errorCopy } from "@/lib/content/error-copy";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="ui-container py-(--section-py)">
      <title>{errorCopy.metaTitle}</title>
      <h1 className="page-title border-b-2 border-fg pb-(--space-4)">{errorCopy.title}</h1>
      <p className="mt-(--space-5) max-w-2xl text-muted">{errorCopy.body}</p>
      <div className="mt-(--space-6) flex flex-wrap gap-4">
        <button type="button" onClick={reset} className="ui-btn ui-btn-primary">
          {errorCopy.retry}
        </button>
        <Link href="/" className="ui-btn ui-btn-outline">
          {errorCopy.home}
        </Link>
      </div>
    </div>
  );
}
