/** Decorative reading progress, driven by CSS `scroll()` and hidden without support (spec §2.1). */
export function ScrollProgress() {
  return <div aria-hidden="true" className="scroll-progress fixed inset-x-0 top-[62px] z-40 h-0.5 bg-accent" />;
}
