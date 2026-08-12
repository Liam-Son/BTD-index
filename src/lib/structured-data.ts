// Structured-data (JSON-LD) contract for the deployed site.
// Used by both the vitest suite and scripts/check-deployment-seo.mjs so the
// source and the live deployment are checked against the same expectations.

export interface JsonLdNode {
  "@type"?: string | string[];
  [key: string]: unknown;
}

/** Extract every JSON-LD block from an HTML document. Invalid JSON is skipped. */
export function extractJsonLd(html: string): JsonLdNode[] {
  const blocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  const nodes: JsonLdNode[] = [];
  for (const [, raw] of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse((raw ?? "").trim());
    } catch {
      continue;
    }
    nodes.push(...flatten(parsed));
  }
  return nodes;
}

/** Flatten arrays and @graph containers into a list of schema nodes. */
export function flatten(value: unknown): JsonLdNode[] {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (!value || typeof value !== "object") return [];
  const node = value as JsonLdNode;
  const graph = (node as { "@graph"?: unknown })["@graph"];
  if (graph) return flatten(graph);
  return [node];
}

export function typesOf(nodes: JsonLdNode[]): string[] {
  return nodes.flatMap((n) => (Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]])).filter(
    (t): t is string => typeof t === "string",
  );
}

export function nodesOfType(nodes: JsonLdNode[], type: string): JsonLdNode[] {
  return nodes.filter((n) => {
    const t = n["@type"];
    return Array.isArray(t) ? t.includes(type) : t === type;
  });
}

/** Required schema types per canonical page. */
export const REQUIRED_SCHEMA_TYPES: Record<string, string[]> = {
  "/": ["Organization", "WebSite"],
  "/stocks": ["Organization", "WebSite", "FAQPage"],
  "/crypto": ["Organization", "WebSite", "FAQPage"],
};

const REQUIRED_PROPS: Record<string, string[]> = {
  Organization: ["name", "url"],
  WebSite: ["name", "url"],
  FAQPage: ["mainEntity"],
  Article: ["headline"],
  Product: ["name"],
};

/**
 * Validate the JSON-LD found in an HTML document for a given path.
 * Returns a list of human-readable problems; empty means valid.
 */
export function validateStructuredData(html: string, path: string): string[] {
  const problems: string[] = [];
  const nodes = extractJsonLd(html);

  if (nodes.length === 0) {
    problems.push(`${path}: no JSON-LD structured data found`);
    return problems;
  }

  for (const node of nodes) {
    if (!node["@context"] && !("@id" in node)) {
      problems.push(`${path}: a JSON-LD node is missing @context`);
    }
    const type = Array.isArray(node["@type"]) ? node["@type"][0] : node["@type"];
    if (!type) {
      problems.push(`${path}: a JSON-LD node is missing @type`);
      continue;
    }
    for (const prop of REQUIRED_PROPS[type] ?? []) {
      const val = node[prop];
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && !val.length)) {
        problems.push(`${path}: ${type} schema is missing required property "${prop}"`);
      }
    }
  }

  const present = new Set(typesOf(nodes));
  for (const required of REQUIRED_SCHEMA_TYPES[path] ?? []) {
    if (!present.has(required)) {
      problems.push(`${path}: missing ${required} structured data`);
    }
  }

  // FAQ answers must be non-empty.
  for (const faq of nodesOfType(nodes, "FAQPage")) {
    const questions = Array.isArray(faq["mainEntity"]) ? faq["mainEntity"] : [];
    if (!questions.length) problems.push(`${path}: FAQPage has no questions`);
    for (const q of questions as JsonLdNode[]) {
      const answer = q?.["acceptedAnswer"] as JsonLdNode | undefined;
      if (!q?.["name"] || !answer || !answer["text"]) {
        problems.push(`${path}: FAQPage question is missing a name or acceptedAnswer.text`);
      }
    }
  }

  return problems;
}

// ---------------------------------------------------------------------------
// Canonical schema payloads used by the routes (single source of truth so the
// tests validate exactly what ships).
// ---------------------------------------------------------------------------

const SITE = "https://dip-finder-score.lovable.app";

export const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "BTD Index™",
      url: SITE,
      description:
        "Quantitative research terminal publishing the BTD Score, a 0-100 buy-the-dip attractiveness rating for global stocks, crypto, ETFs and commodities.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      name: "BTD Index™ — Quantitative Buy-the-Dip Terminal",
      url: SITE,
      publisher: { "@id": `${SITE}/#organization` },
      description:
        "Live buy-the-dip rankings scoring 60+ global assets 0-100 on valuation, momentum, market fear, quality and risk.",
    },
  ],
} as const;

export interface FaqItem {
  q: string;
  a: string;
}

export function buildFaqJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
