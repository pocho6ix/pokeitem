/**
 * YouTube video ID for the /beta page.
 * Set NEXT_PUBLIC_BETA_VIDEO_ID in your .env to override.
 * If the value is "PLACEHOLDER_VIDEO_ID" or empty, the video section is hidden.
 */
export const BETA_VIDEO_ID =
  process.env.NEXT_PUBLIC_BETA_VIDEO_ID ?? "PLACEHOLDER_VIDEO_ID";

export const BETA_VIDEO_ENABLED =
  !!BETA_VIDEO_ID && BETA_VIDEO_ID !== "PLACEHOLDER_VIDEO_ID";
