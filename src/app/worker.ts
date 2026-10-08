import { createRequestHandler } from "react-router";

import type { ServerBuild } from "react-router";

/**
 * An app's worker: React Router's handler, with every response marked uncacheable.
 * Workers Cache is on (ecu config) and keys on path alone, so a cached page could be
 * Served to another tenant or viewer. Nothing rendered here is safe to share, and each
 * Document's CSP nonce must be its own.
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
