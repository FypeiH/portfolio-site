import type { Metadata } from "next";
import Link from "next/link";
import { getUi } from "@/lib/content/load";

export function generateMetadata(): Metadata {
  return { title: getUi().metaNotFoundTitle };
}

export default function NotFound() {
  const ui = getUi();
  const links = [
    { href: "/", label: ui.notFoundHome },
    { href: "/#projects", label: ui.notFoundProjects },
    { href: "/#contact", label: ui.notFoundContact },
  ];
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{ui.notFoundTitle}</h1>
      <p className="mt-4 text-muted">{ui.notFoundBody}</p>
      <ul className="mt-8 flex flex-wrap gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="ui-btn-outline px-5">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
