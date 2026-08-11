import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_URL, sitemapEntries } from "../sitemap";
import { GOOGLE_SITE_VERIFICATION, hasVerificationMeta } from "../seo-verification";

const rootRoute = readFileSync(resolve(process.cwd(), "src/routes/__root.tsx"), "utf8");

describe("Search Console verification (source)", () => {
  it("keeps the verification token in the root head", () => {
    expect(rootRoute).toContain("google-site-verification");
    expect(rootRoute).toContain("GOOGLE_SITE_VERIFICATION");
    expect(GOOGLE_SITE_VERIFICATION).toMatch(/^[A-Za-z0-9_-]{20,}$/);
  });

  it("detects a live verification meta tag", () => {
    expect(
      hasVerificationMeta(
        `<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}" />`,
      ),
    ).toBe(true);
    expect(hasVerificationMeta(`<meta name="google-site-verification" content="wrong" />`)).toBe(
      false,
    );
  });
});

// Live post-deployment checks. Opt in with SEO_LIVE=1 (optionally SEO_CHECK_BASE_URL=...),
// e.g. in a post-deploy job: SEO_LIVE=1 bunx vitest run deployment-seo
const live = process.env["SEO_LIVE"] === "1";
const target = (process.env["SEO_CHECK_BASE_URL"] ?? BASE_URL).replace(/\/+$/, "");

describe.runIf(live)("deployed site", () => {
  it(
    "serves a reachable sitemap listing the canonical URLs",
    async () => {
      const res = await fetch(`${target}/sitemap.xml`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type") ?? "").toMatch(/xml/i);
      const xml = await res.text();
      for (const entry of sitemapEntries) {
        expect(xml).toContain(`<loc>${target}${entry.path}</loc>`);
      }
    },
    30_000,
  );

  it(
    "still serves the Search Console verification meta tag on the root",
    async () => {
      const res = await fetch(`${target}/`);
      expect(res.status).toBe(200);
      expect(hasVerificationMeta(await res.text())).toBe(true);
    },
    30_000,
  );
});
