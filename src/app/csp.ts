/** Sources an app adds to the base policy, by directive: `{ "connect-src": ["https://api.example.com"] }`. */
export type Sources = Readonly<Record<string, readonly string[]>>;

/**
 * The Content-Security-Policy a four-stroke app sends with every document: a strict base,
 * Plus the sources that app adds.
 *
 * Scripts run by nonce alone, and 'strict-dynamic' passes that trust to the modules they
 * Import, so no host list has to follow where a bundle lives. Everything else is the app's
 * Own origin until the app says otherwise. Each directive an app is likely to extend lists
 * 'self' itself, because a directive replaces `default-src` rather than adding to it.
 *
 * An app's sources are appended, never substituted, so it can widen the base but not
 * Change how scripts are trusted.
 */
export const contentSecurityPolicy = (
  nonce: string,
  { dev = false, sources = {} }: { dev?: boolean; sources?: Sources } = {},
): string => {
  const policy: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [`'nonce-${nonce}'`, "'strict-dynamic'"],
    // Vite adds each stylesheet as a <style> without a nonce in dev, and a browser ignores
    // 'unsafe-inline' wherever a nonce is listed beside it.
    "style-src": ["'self'", dev ? "'unsafe-inline'" : `'nonce-${nonce}'`],
    "font-src": ["'self'"],
    "img-src": ["'self'"],
    // Vite's hot reload talks over a websocket, on a port of each app's choosing.
    "connect-src": ["'self'", ...(dev ? ["ws://localhost:*"] : [])],
    // Without it a worker falls back to `script-src`, which no worker script can satisfy.
    "worker-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  for (const [directive, added] of Object.entries(sources))
    policy[directive] = [...(policy[directive] ?? []), ...added];

  return Object.entries(policy)
    .map(([directive, list]) => `${directive} ${list.join(" ")}`)
    .join("; ");
};

/** 128 random bits, base64: a fresh one for every document. */
export const createNonce = (): string =>
  btoa(String.fromCodePoint(...crypto.getRandomValues(new Uint8Array(16))));
