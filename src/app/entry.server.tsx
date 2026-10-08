/*
 * An app's `src/entry.server.tsx`, naming what its pages load beyond its own origin:
 *
 *   export { handleError } from "four-stroke/src/app/entry.server";
 *   export default createHandleRequest({ "connect-src": ["https://api.example.com"] });
 */

import { renderToReadableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { contentSecurityPolicy, createNonce } from "./csp";

import type { Sources } from "./csp";
import type { EntryContext, HandleErrorFunction } from "react-router";

// Loader and render errors reach the browser masked as "Unexpected Server Error", so this is the
// Only place their details exist. Logged as text, which survives any log pipeline an Error
// Object might not.
export const handleError: HandleErrorFunction = (error, { request }) => {
  if (request.signal.aborted) return;
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(`${request.method} ${new URL(request.url).pathname}: ${detail}`);
};

export const createHandleRequest =
  (sources: Sources = {}) =>
  async (
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    routerContext: EntryContext,
  ): Promise<Response> => {
    // `ServerRouter` hands the nonce on to `Links`, `Scripts` and `ScrollRestoration`, so an
    // App's layout passes nothing. Only a dev server's manifest carries a hot reload runtime.
    const nonce = createNonce(),
      dev = routerContext.manifest.hmr !== undefined;
    let shellRendered = false;

    const body = await renderToReadableStream(
      <ServerRouter context={routerContext} nonce={nonce} url={request.url} />,
      {
        nonce,
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );
    shellRendered = true;

    responseHeaders.set("Content-Type", "text/html");
    responseHeaders.set("Content-Security-Policy", contentSecurityPolicy(nonce, { dev, sources }));
    return new Response(body, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  };
