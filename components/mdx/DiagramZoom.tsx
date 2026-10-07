"use client";

import { useRef } from "react";

interface DiagramZoomProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  labels: { open: string; close: string };
}

/**
 * Full-size view of a diagram in a native modal <dialog>: Esc and the close button dismiss it, and
 * focus returns to the button that opened it. The image inside is the same cached SVG at 1:1.
 */
export function DiagramZoom({ src, alt, width, height, labels }: DiagramZoomProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={opener} type="button" className="ui-btn ui-btn-outline" onClick={() => dialog.current?.showModal()}>
        {labels.open}
      </button>
      <dialog ref={dialog} aria-label={alt} className="diagram-dialog" onClose={() => opener.current?.focus()}>
        <form method="dialog" className="flex justify-end border-b-2 border-fg p-3">
          <button type="submit" className="ui-btn ui-btn-primary" autoFocus>
            {labels.close}
          </button>
        </form>
        <div className="overflow-auto p-4 md:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG: the image optimizer adds nothing */}
          <img src={src} alt="" width={width} height={height} decoding="async" className="mx-auto max-w-none" />
        </div>
      </dialog>
    </>
  );
}
