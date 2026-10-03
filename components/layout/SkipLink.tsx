export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:border-2 focus:border-fg focus:bg-accent focus:px-4 focus:py-2 focus:font-mono focus:text-accent-ink"
    >
      {label}
    </a>
  );
}
