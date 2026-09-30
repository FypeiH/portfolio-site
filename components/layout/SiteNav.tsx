"use client";

import { HomeLink } from "@/components/ui/HomeLink";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import type { NavItem, SectionId } from "@/lib/content/types";

interface SiteNavProps {
  items: readonly NavItem[];
  cv: { href: string; label: string };
  labels: { nav: string; menuOpen: string; menuClose: string; resume: string; pdfSuffix: string; newTab: string };
}

const DESKTOP_QUERY = "(min-width: 48rem)";
const SPY_MARGIN = "-40% 0px -55% 0px";

export function SiteNav({ items, cv, labels }: SiteNavProps) {
  const pathname = usePathname();
  const active = useScrollSpy(items, pathname === "/");
  const { open, toggle, close, closeOnFocusLeave, containerRef, buttonRef, panelRef } = useDisclosure(pathname);

  const linkClass =
    "relative inline-flex min-h-11 items-center px-3 text-sm text-muted transition-colors hover:text-fg aria-[current=true]:text-accent " +
    "after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform " +
    "aria-[current=true]:after:scale-x-100 motion-reduce:after:transition-none";

  const links = items.map((item) => (
    <li key={item.id}>
      <HomeLink href={`/#${item.id}`} aria-current={active === item.id ? "true" : undefined} className={linkClass} onClick={close}>
        {item.label}
      </HomeLink>
    </li>
  ));

  const resumeLink = (
    <a
      href={cv.href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
    >
      {labels.resume}
      <span className="sr-only">
        {" "}
        {labels.pdfSuffix} {labels.newTab}
      </span>
    </a>
  );

  return (
    <nav aria-label={labels.nav} ref={containerRef} onBlur={closeOnFocusLeave} className="flex min-w-0 flex-1 items-center justify-end gap-2">
      <ul className="hidden min-w-0 items-center overflow-x-auto md:flex no-js:flex">{links}</ul>
      <div className="hidden md:block">{resumeLink}</div>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={toggle}
        className="hidden min-h-11 min-w-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium js:inline-flex md:hidden!"
      >
        {open ? labels.menuClose : labels.menuOpen}
      </button>
      <div
        id="mobile-nav"
        ref={panelRef}
        data-open={open}
        className="invisible fixed inset-x-0 top-16 -translate-y-2 border-b border-border bg-bg/95 px-5 pb-6 pt-2 opacity-0 backdrop-blur transition duration-150 data-[open=true]:visible data-[open=true]:translate-y-0 data-[open=true]:opacity-100 motion-reduce:transition-none md:hidden"
      >
        <ul className="flex flex-col">{links}</ul>
        <div className="mt-4">{resumeLink}</div>
      </div>
    </nav>
  );
}

/** One IntersectionObserver over the nav sections; no scroll listeners (spec §2.3). */
function useScrollSpy(items: readonly NavItem[], enabled: boolean): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const ids = new Set<string>(items.map((item) => item.id));
    const toActive = (id: string) => (ids.has(id) ? (id as SectionId) : null);
    const sections = ["top", ...ids].map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);

    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(toActive(entry.target.id));
      },
      { rootMargin: SPY_MARGIN, threshold: 0 },
    );
    sections.forEach((section) => spy.observe(section));

    const lastId = items.at(-1)?.id ?? null;
    const pageEnd = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setActive(lastId);
    });
    const sentinel = document.getElementById("page-end");
    if (sentinel) pageEnd.observe(sentinel);

    return () => {
      spy.disconnect();
      pageEnd.disconnect();
    };
  }, [items, enabled]);

  return enabled ? active : null;
}

/** Disclosure menu: Esc, outside click, focus leaving, desktop resize and route change all close it (spec §2.5). */
function useDisclosure(pathname: string) {
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }
  const containerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onViewportChange = () => desktop.matches && setOpen(false);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    desktop.addEventListener("change", onViewportChange);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      desktop.removeEventListener("change", onViewportChange);
    };
  }, [open]);

  return {
    open,
    containerRef,
    buttonRef,
    panelRef,
    toggle: () => setOpen((value) => !value),
    close: () => setOpen(false),
    closeOnFocusLeave: (event: FocusEvent<HTMLElement>) => {
      if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    },
  };
}
