#!/usr/bin/env node
// Post-deployment SEO smoke check:
//   1. /sitemap.xml is reachable, XML, and lists the canonical URLs
//   2. the site root still serves the Google Search Console verification meta tag
//
// Usage: node scripts/check-deployment-seo.mjs [baseUrl]
// Exits non-zero when a check fails.

const BASE_URL = (
  process.argv[2] ||
  process.env.SEO_CHECK_BASE_URL ||
  "https://dip-finder-score.lovable.app"
).replace(/\/+$/, "");

import { REQUIRED_SCHEMA_TYPES, validateStructuredData } from "../src/lib/structured-data.ts";

const GOOGLE_SITE_VERIFICATION = "NtTwNfTt1oLEPfKEH2vqTZ_YMNqkWYVH-sEmAy5yvJM";
const CANONICAL_PATHS = ["/", "/stocks"];

const failures = [];
const ok = (msg) => console.log(`PASS  ${msg}`);
const fail = (msg) => {
  failures.push(msg);
  console.error(`FAIL  ${msg}`);
};

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: "follow",
    headers: { "User-Agent": "btd-index-seo-check" },
  });
  return { res, body: await res.text() };
}

async function checkSitemap() {
  const { res, body } = await get("/sitemap.xml");
  if (!res.ok) return fail(`sitemap.xml unreachable (HTTP ${res.status})`);
  ok(`sitemap.xml reachable (HTTP ${res.status})`);

  const type = res.headers.get("content-type") ?? "";
  if (!/xml/i.test(type)) fail(`sitemap.xml content-type is "${type}", expected XML`);
  else ok(`sitemap.xml content-type ${type}`);

  if (!body.includes("<urlset")) return fail("sitemap.xml is not a valid <urlset> document");
  ok("sitemap.xml is a valid <urlset> document");

  const locs = [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  for (const path of CANONICAL_PATHS) {
    const expected = `${BASE_URL}${path}`;
    if (locs.includes(expected)) ok(`sitemap lists ${expected}`);
    else fail(`sitemap is missing ${expected}`);
  }
  for (const loc of locs) {
    if (/index\.html|\?/.test(loc) || (loc !== `${BASE_URL}/` && loc.endsWith("/"))) {
      fail(`sitemap lists a non-canonical URL: ${loc}`);
    }
  }
}

async function checkRobots() {
  const { res, body } = await get("/robots.txt");
  if (!res.ok) return fail(`robots.txt unreachable (HTTP ${res.status})`);
  if (body.includes(`${BASE_URL}/sitemap.xml`)) ok("robots.txt points at the canonical sitemap");
  else fail("robots.txt does not reference the canonical sitemap URL");
}

async function checkVerification() {
  const { res, body } = await get("/");
  if (!res.ok) return fail(`site root unreachable (HTTP ${res.status})`);
  const present = new RegExp(
    `<meta[^>]+name=["']google-site-verification["'][^>]+content=["']${GOOGLE_SITE_VERIFICATION}["']`,
  ).test(body);
  if (present) ok("Search Console verification meta tag is live on the site root");
  else fail("Search Console verification meta tag is missing from the site root HTML");
}

async function checkStructuredData() {
  for (const path of Object.keys(REQUIRED_SCHEMA_TYPES)) {
    const { res, body } = await get(path);
    if (!res.ok) {
      fail(`${path} unreachable (HTTP ${res.status})`);
      continue;
    }
    const problems = validateStructuredData(body, path);
    if (problems.length) problems.forEach(fail);
    else ok(`${path} serves valid ${REQUIRED_SCHEMA_TYPES[path].join(" + ")} structured data`);
  }
}

console.log(`Checking ${BASE_URL}\n`);
await checkSitemap();
await checkRobots();
await checkVerification();
await checkStructuredData();

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll deployment SEO checks passed.");
