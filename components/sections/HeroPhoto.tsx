import { HERO_ASCII } from "@/lib/hero-photo";

export function HeroPhoto() {
  return (
    <div className="hidden lg:col-span-4 lg:block">
      <div className="inset-0 flex items-center justify-center overflow-hidden">
        <pre role="img" aria-label="Filipe's face in ASCII art" className="hero-photo-ascii m-0 max-w-full text-center">
          {HERO_ASCII}
        </pre>
      </div>
    </div>
  );
}
