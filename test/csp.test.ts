import { contentSecurityPolicy, createNonce } from "../src/app/csp";

const directives = (policy: string): Map<string, string[]> =>
  new Map(
    policy.split("; ").map((directive) => {
      const [name = "", ...sources] = directive.split(" ");
      return [name, sources];
    }),
  );

describe("the base policy", () => {
  const built = directives(contentSecurityPolicy("abc")),
    dev = directives(contentSecurityPolicy("abc", { dev: true }));

  it("runs scripts by nonce alone", () => {
    expect(built.get("script-src")).toEqual(["'nonce-abc'", "'strict-dynamic'"]);
    expect(dev.get("script-src")).toEqual(["'nonce-abc'", "'strict-dynamic'"]);
  });

  it("allows inline style elements only in dev, where a nonce would void it", () => {
    expect(built.get("style-src")).toEqual(["'self'", "'nonce-abc'"]);
    expect(dev.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("opens the hot reload websocket only in dev", () => {
    expect(built.get("connect-src")).toEqual(["'self'"]);
    expect(dev.get("connect-src")).toEqual(["'self'", "ws://localhost:*"]);
  });

  it("refuses framing, plugins and a rewritten base", () => {
    expect(built.get("frame-ancestors")).toEqual(["'none'"]);
    expect(built.get("object-src")).toEqual(["'none'"]);
    expect(built.get("base-uri")).toEqual(["'none'"]);
  });
});

describe("an app's sources", () => {
  const policy = directives(
    contentSecurityPolicy("abc", {
      sources: {
        "connect-src": ["https://api.example.com"],
        "script-src": ["https://cdn.example.com"],
        "style-src-attr": ["'unsafe-inline'"],
      },
    }),
  );

  it("are added to a directive the base has, keeping the base's", () => {
    expect(policy.get("connect-src")).toEqual(["'self'", "https://api.example.com"]);
  });

  it("cannot drop the nonce from scripts", () => {
    expect(policy.get("script-src")).toEqual([
      "'nonce-abc'",
      "'strict-dynamic'",
      "https://cdn.example.com",
    ]);
  });

  it("can name a directive the base leaves out", () => {
    expect(policy.get("style-src-attr")).toEqual(["'unsafe-inline'"]);
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
