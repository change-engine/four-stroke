import { contentSecurityPolicy, createNonce } from "../src/app/csp";

const directives = (policy: string): Map<string, string[]> =>
  new Map(
    policy.split("; ").map((directive) => {
      const [name = "", ...sources] = directive.split(" ");
      return [name, sources];
    }),
  );

describe("the document policy", () => {
  const built = directives(contentSecurityPolicy("abc")),
    dev = directives(contentSecurityPolicy("abc", { dev: true }));

  it("runs scripts by nonce alone", () => {
    expect(built.get("script-src")).toEqual(["'nonce-abc'", "'strict-dynamic'"]);
    expect(dev.get("script-src")).toEqual(["'nonce-abc'", "'strict-dynamic'"]);
  });

  it("allows inline style elements only in dev, where a nonce would void it", () => {
    expect(built.get("style-src")).toContain("'nonce-abc'");
    expect(built.get("style-src")).not.toContain("'unsafe-inline'");
    expect(dev.get("style-src")).toContain("'unsafe-inline'");
    expect(dev.get("style-src")).not.toContain("'nonce-abc'");
  });

  it("opens the hot reload websocket only in dev", () => {
    expect(built.get("connect-src")).toEqual(["'self'", "https://data.changeengine.com"]);
    expect(dev.get("connect-src")).toContain("ws://localhost:*");
  });

  it("refuses framing, plugins and a rewritten base", () => {
    expect(built.get("frame-ancestors")).toEqual(["'none'"]);
    expect(built.get("object-src")).toEqual(["'none'"]);
    expect(built.get("base-uri")).toEqual(["'none'"]);
  });
});

describe("a nonce", () => {
  it("is 128 bits of base64", () => {
    expect(atob(createNonce())).toHaveLength(16);
  });

  it("is new each time", () => {
    expect(new Set(Array.from({ length: 100 }, createNonce)).size).toBe(100);
  });
});
