import { createRequestHandler } from "react-router";

import type { ServerBuild } from "react-router";

/**
 * An app's worker: React Router's handler, with every response marked uncacheable. A
 * Rendered page is the viewer's own, and a cache keyed on its path could hand it to
 * Someone else; each document's CSP nonce must be its own as well.
 *
 * An app's `workers/app.ts`, which alone can import the build:
 * `export default createWorker(() => import("virtual:react-router/server-build"), import.meta.env.MODE);`
 */
export const createWorker = (build: () => Promise<ServerBuild>, mode: string): ExportedHandler => {
  const requestHandler = createRequestHandler(build, mode);

  return {
    async fetch(request) {
      const response = await requestHandler(request);
      response.headers.set("Cache-Control", "no-store");
      return response;
    },
  };
};
