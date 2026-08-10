import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "../../server";

const req = (path: string, init?: RequestInit) =>
  new Request(`https://dip-finder-score.lovable.app${path}`, init);

describe("canonicalRedirect (unit)", () => {
  it.each([
    ["/index.html", "/"],
    ["/index.html?utm_source=x", "/"],
    ["/stocks/", "/stocks"],
    ["/stocks/?utm_source=x&page=2", "/stocks"],
    ["/stocks//", "/stocks"],
  ])("301s %s -> %s without query string", (from, to) => {
    const res = canonicalRedirect(req(from));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(301);
    expect(res!.headers.get("location")).toBe(to);
  });

  it.each(["/", "/stocks", "/sitemap.xml"])("does not redirect canonical path %s", (path) => {
    expect(canonicalRedirect(req(path))).toBeNull();
  });

  it("leaves query strings on canonical paths alone", () => {
    expect(canonicalRedirect(req("/stocks?filter=tech"))).toBeNull();
  });

  it("ignores non-GET/HEAD requests", () => {
    expect(canonicalRedirect(req("/stocks/", { method: "POST" }))).toBeNull();
  });
});
