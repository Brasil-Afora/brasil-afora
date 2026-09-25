/**
 * Object-position focal points (x% y%) for curated photos whose subject sits
 * off-centre. Every cover is a wide banner, so a centred crop of a tall
 * portrait keeps the chest and cuts the face. Photos not listed stay centred.
 */
const CURATED_IMAGE_FOCUS: Record<string, string> = {
  // Aspire Leaders Program: 686×1000 headshot.
  "/curated/photo-31282ce33466ef70.jpg": "50% 10%",
};

export const curatedImagePosition = (src: string): string | undefined =>
  CURATED_IMAGE_FOCUS[src];
