import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_URL, buildSitemapXml, sitemapEntries } from "../sitemap";
import { canonicalRedirect } from "../../server";

const CANONICAL_PATHS = ["/", "/stocks", "/crypto"];

const robots = readFileSync(resolve(process.cwd(), "public/robots.txt"), "utf8");

describe("sitemap.xml", () => {
  it("lists exactly the canonical paths", () => {
    expect(sitemapEntries.map((e) => e.path).sort()).toEqual([...CANONICAL_PATHS].sort());
  });

  it("emits absolute canonical <loc> URLs", () => {
    const xml = buildSitemapXml();
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(CANONICAL_PATHS.map((p) => `${BASE_URL}${p}`));
  });

  it("never lists non-canonical URL shapes", () => {
    const xml = buildSitemapXml();
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]!);
    for (const loc of locs) {
      const url = new URL(loc);
      expect(url.origin).toBe(BASE_URL);
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
      expect(loc).not.toMatch(/index\.html/);
      expect(url.pathname === "/" || !url.pathname.endsWith("/")).toBe(true);
    }
  });

  it("only lists URLs that do not redirect", () => {
    for (const entry of sitemapEntries) {
      expect(canonicalRedirect(new Request(`${BASE_URL}${entry.path}`))).toBeNull();
    }
  });

  it("produces valid urlset XML", () => {
    const xml = buildSitemapXml();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
    expect([...xml.matchAll(/<url>/g)]).toHaveLength(sitemapEntries.length);
  });
});

describe("robots.txt", () => {
  it("points at the canonical sitemap URL", () => {
    const sitemapLines = robots
      .split("\n")
      .filter((l) => l.toLowerCase().startsWith("sitemap:"))
      .map((l) => l.slice("sitemap:".length).trim());
    expect(sitemapLines).toEqual([`${BASE_URL}/sitemap.xml`]);
  });

  it("allows crawling and never blocks the whole site", () => {
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).not.toMatch(/^Disallow: \/$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
  });

  it("explicitly allows every canonical path", () => {
    const allows = robots
      .split("\n")
      .filter((l) => l.toLowerCase().startsWith("allow:"))
      .map((l) => l.slice("allow:".length).trim());
    for (const path of CANONICAL_PATHS) {
      const expected = path === "/" ? ["/", "/$"] : [path, `${path}$`];
      expect(allows.some((a) => expected.includes(a))).toBe(true);
    }
  });

  it("disallows query-string duplicates", () => {
    expect(robots).toMatch(/^Disallow: \/\*\?$/m);
  });

  it("does not reference non-canonical URLs", () => {
    expect(robots).not.toMatch(/index\.html/);
    expect(robots).not.toMatch(/\/stocks\/\s*$/m);
  });
});
