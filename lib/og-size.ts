/** Size of every Open Graph image (1.91:1). Kept out of lib/og.tsx, which is server-only. */
export const OG_SIZE = { width: 1200, height: 630 };

/** Stack tags drawn on a case-study OG card. */
export const OG_MAX_TAGS = 4;

/**
 * Part of the case-study OG cache-buster (lib/metadata.ts). The rest of the hash follows the content
 * the card draws; bump this when the card's design changes (lib/og.tsx, opengraph-image.tsx).
 */
export const OG_TEMPLATE_VERSION = 1;
