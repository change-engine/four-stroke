/**
 * The Content-Security-Policy a four-stroke app sends with every document.
 *
 * Scripts run by nonce alone, and 'strict-dynamic' passes that trust to the modules they
 * Import, so no host list has to follow where a bundle lives. The rest is what the apps
 * Load: Google Fonts, images from any https host (a tenant's logo, a sign-in provider's
 * Avatar), and data from `https://data.changeengine.com`. The auth service worker
 * Rewrites that address to the tenant's shard, but the page's policy is checked before
 * The worker sees the request, so the address is the one listed.
 *
 * Inline `style` attributes are allowed. React renders `style` props into them on the
 * Server, hydration does not restore what the browser dropped, and a style is not a script.
 */
export const contentSecurityPolicy = (nonce: string, { dev = false } = {}): string =>
  Object.entries({
    "default-src": ["'self'"],
    "script-src": [`'nonce-${nonce}'`, "'strict-dynamic'"],
    // Vite adds each stylesheet as a <style> without a nonce in dev, and a browser ignores
    // 'unsafe-inline' wherever a nonce is listed beside it.
    "style-src": [
      "'self'",
      dev ? "'unsafe-inline'" : `'nonce-${nonce}'`,
      "https://fonts.googleapis.com",
    ],
    "style-src-attr": ["'unsafe-inline'"],
    "font-src": ["https://fonts.gstatic.com"],
    "img-src": ["'self'", "https:"],
    // Vite's hot reload talks over a websocket, on a port of each app's choosing.
    "connect-src": [
      "'self'",
      "https://data.changeengine.com",
      ...(dev ? ["ws://localhost:*"] : []),
    ],
    "worker-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  })
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");

/** 128 random bits, base64: a fresh one for every document. */
export const createNonce = (): string =>
  btoa(String.fromCodePoint(...crypto.getRandomValues(new Uint8Array(16))));
