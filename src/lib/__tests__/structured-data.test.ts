import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_URL } from "../sitemap";
import {
  REQUIRED_SCHEMA_TYPES,
  extractJsonLd,
  nodesOfType,
  typesOf,
  validateStructuredData,
} from "../structured-data";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const rootRoute = read("src/routes/__root.tsx");
const stocksRoute = read("src/routes/stocks.tsx");

const wrap = (json: string) => `<script type="application/ld+json">${json}</script>`;

/** Pull the JSON.stringify(...) payloads out of a route's head() scripts. */
function jsonLdFromSource(source: string): string[] {
  const out: string[] = [];
  const marker = "JSON.stringify(";
  let idx = source.indexOf(marker);
  while (idx !== -1) {
    const start = source.indexOf("{", idx);
    let depth = 0;
    for (let i = start; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") {
        depth--;
        if (depth === 0) {
          out.push(source.slice(start, i + 1));
          break;
        }
      }
    }
    idx = source.indexOf(marker, idx + marker.length);
  }
  return out;
}

describe("structured data helpers", () => {
  it("extracts and flattens @graph nodes", () => {
    const nodes = extractJsonLd(
      wrap(
        JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [{ "@type": "Organization" }, { "@type": "WebSite" }],
        }),
      ),
    );
    expect(typesOf(nodes)).toEqual(["Organization", "WebSite"]);
  });

  it("ignores malformed JSON-LD blocks", () => {
    expect(extractJsonLd(wrap("{ not json"))).toEqual([]);
  });

  it("flags a page with no structured data", () => {
    expect(validateStructuredData("<html></html>", "/")).toContain(
      "/: no JSON-LD structured data found",
    );
  });

  it("flags missing required types and properties", () => {
    const html = wrap(JSON.stringify({ "@context": "https://schema.org", "@type": "Organization" }));
    const problems = validateStructuredData(html, "/");
    expect(problems).toContain('/: Organization schema is missing required property "name"');
    expect(problems).toContain("/: missing WebSite structured data");
  });

  it("flags an FAQPage with an empty answer", () => {
    const html = wrap(
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [{ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer" } }],
      }),
    );
    expect(validateStructuredData(html, "/stocks").join("\n")).toContain("acceptedAnswer.text");
  });
});

describe("structured data (source)", () => {
  const rootBlocks = jsonLdFromSource(rootRoute).map((j) => wrap(j)).join("\n");

  it("declares Organization and WebSite in the root head", () => {
    const nodes = extractJsonLd(rootBlocks);
    const types = typesOf(nodes);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    const org = nodesOfType(nodes, "Organization")[0]!;
    expect(org["name"]).toBeTruthy();
    expect(org["url"]).toBe(BASE_URL);
  });

  it("serves valid combined structured data for the homepage", () => {
    expect(validateStructuredData(rootBlocks, "/")).toEqual([]);
  });

  it("declares a valid FAQPage on /stocks", () => {
    const html = [rootBlocks, ...jsonLdFromSource(stocksRoute).map(wrap)].join("\n");
    expect(validateStructuredData(html, "/stocks")).toEqual([]);
  });

  it("keeps FAQ answers substantive", () => {
    const nodes = extractJsonLd(jsonLdFromSource(stocksRoute).map(wrap).join("\n"));
    const faq = nodesOfType(nodes, "FAQPage")[0]!;
    const questions = faq["mainEntity"] as Array<{ acceptedAnswer: { text: string } }>;
    expect(questions.length).toBeGreaterThanOrEqual(3);
    for (const q of questions) expect(q.acceptedAnswer.text.length).toBeGreaterThan(80);
  });
});

// Live post-deployment checks. Opt in with SEO_LIVE=1 (optionally SEO_CHECK_BASE_URL=...).
const live = process.env["SEO_LIVE"] === "1";
const target = (process.env["SEO_CHECK_BASE_URL"] ?? BASE_URL).replace(/\/+$/, "");

describe.runIf(live)("structured data (deployed site)", () => {
  for (const path of Object.keys(REQUIRED_SCHEMA_TYPES)) {
    it(
      `serves valid structured data on ${path}`,
      async () => {
        const res = await fetch(`${target}${path}`);
        expect(res.status).toBe(200);
        expect(validateStructuredData(await res.text(), path)).toEqual([]);
      },
      30_000,
    );
  }
});
