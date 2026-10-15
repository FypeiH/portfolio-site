/** The hero photo (scripts/hero-photo.ts): displayed at `width`×`height` CSS px on wide screens, 1x and 2x files. */
export const HERO_PHOTO = {
  width: 288,
  height: 360,
  srcsetWidths: [288, 576],
  /** Width of the processed master the script keeps (4:5, like the display size). */
  masterWidth: 576,
  treatment: "duotone",
  /** Decorative: it sits next to the h1 with his name, and About already describes the same photo ("Portrait of Filipe Bravo"). */
  alt: "",
} as const;

export const heroPhotoPath = (width: number, format: "avif" | "webp") => `/images/profile/filipe-bravo-hero-${width}.${format}`;
