// Google Search Console ownership token for https://dip-finder-score.lovable.app/
// Removing or changing this breaks Search Console verification after a deploy.
export const GOOGLE_SITE_VERIFICATION = "NtTwNfTt1oLEPfKEH2vqTZ_YMNqkWYVH-sEmAy5yvJM";

export const GOOGLE_SITE_VERIFICATION_META = `<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}"`;

export function hasVerificationMeta(html: string): boolean {
  return new RegExp(
    `<meta[^>]+name=["']google-site-verification["'][^>]+content=["']${GOOGLE_SITE_VERIFICATION}["']`,
  ).test(html);
}
