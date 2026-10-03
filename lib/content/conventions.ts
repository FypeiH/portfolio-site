/** File-layout and value conventions shared by the schemas, loaders, rules and formatters. */

export const PROJECTS_DIR = "content/projects";
export const projectFile = (slug: string) => `${PROJECTS_DIR}/${slug}.mdx`;

/** Kebab-case slug, used for project file names and every slug reference. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Calendar month as YYYY-MM (01–12). */
export const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const isYearMonth = (value: string) => YEAR_MONTH_PATTERN.test(value);

/** The About portrait is 224 CSS px (visual-direction B1); `pnpm avatar` writes a 224 px WebP next to the source. */
export const AVATAR_THUMB_PX = 224;
export const avatarThumbPath = (src: string) => src.replace(/(\.[a-z0-9]+)?$/i, `-${AVATAR_THUMB_PX}.webp`);
