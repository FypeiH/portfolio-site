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
    <div className="ui-container py-(--section-py)">
      <h1 className="page-title border-b-2 border-fg pb-(--space-4)">{ui.notFoundTitle}</h1>
      <p className="mt-(--space-5) max-w-2xl text-muted">{ui.notFoundBody}</p>
      <ul className="mt-(--space-6) flex flex-wrap gap-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="ui-btn ui-btn-outline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
