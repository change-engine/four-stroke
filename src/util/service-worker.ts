// Every data request is rewritten by `/auth-service-worker.js`, which the dashboard worker
// Serves for every app on the hostname. A request the worker does not see goes to
// Https://data.changeengine.com itself and is refused by CORS. A page is uncontrolled on
// The first visit in a browser, while the worker is still installing, and after a hard
// Reload, so data requests wait here until the worker controls the page.

export const SERVICE_WORKER_URL = "/auth-service-worker.js",
  CLAIM_MESSAGE = "claim",
  CONTROL_TIMEOUT_MS = 10_000;

export interface WorkerContainer {
  readonly controller: unknown;
  readonly ready: Promise<{ readonly active: { postMessage: (message: unknown) => void } | null }>;
  register: (url: string, options: { type: "module" }) => Promise<unknown>;
  addEventListener: (type: "controllerchange", listener: () => void) => void;
  removeEventListener: (type: "controllerchange", listener: () => void) => void;
}

/**
 * Resolves true once a service worker controls the page, or false when none does within
 * `timeoutMs`, so a browser without service workers fails its requests rather than
 * hanging. Registering is idempotent, which lets an app on the hostname that is not the
 * hub get the worker without depending on the hub having been visited first.
 */
export const whenControlled = async (
  container: WorkerContainer | undefined,
  timeoutMs = CONTROL_TIMEOUT_MS,
): Promise<boolean> => {
  if (!container) return false;
  if (container.controller) return true;

  let onChange: (() => void) | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  const changed = new Promise<boolean>((resolve) => {
      onChange = () => resolve(true);
      container.addEventListener("controllerchange", onChange);
    }),
    timedOut = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    }),
    claimed = (async () => {
      await container.register(SERVICE_WORKER_URL, { type: "module" });
      const registration = await container.ready;
      if (container.controller) return true;
      // An active worker claims pages only when it activates, so one that was already
      // Active when this page loaded is asked to claim it now.
      registration.active?.postMessage(CLAIM_MESSAGE);
      return changed;
    })().catch(() => false);

  try {
    return await Promise.race([changed, claimed, timedOut]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (onChange) container.removeEventListener("controllerchange", onChange);
  }
};

let controlled: Promise<boolean> | null = null;

/** `fetch` for the PostgREST clients: waits once per page for the worker, then fetches. */
export const controlledFetch: typeof fetch = async (input, init) => {
  controlled ??= whenControlled(
    typeof navigator === "undefined" ? undefined : navigator.serviceWorker,
  );
  if (!(await controlled)) controlled = null;
  return fetch(input, init);
};
