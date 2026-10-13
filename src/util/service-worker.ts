// For apps whose data requests only work once a service worker at `/auth-service-worker.js`
// Has rewritten them, adding credentials for example. A page is uncontrolled on the first
// Visit in a browser, while the worker is still installing, and after a hard reload, and
// Its requests then bypass the worker; these helpers make them wait until it controls the
// Page. The worker should call `clients.claim()` on `activate` and on a `CLAIM_MESSAGE`.

export const SERVICE_WORKER_URL = "/auth-service-worker.js",
  CLAIM_MESSAGE = "claim",
  CONTROL_TIMEOUT_MS = 10_000;

// The Trusted Types policy four-stroke creates, which every app's CSP names. The worker's
// Address is the only thing it vouches for.
export const TRUSTED_TYPES_POLICY = "four-stroke";

/**
 * A browser's `trustedTypes`, as far as this needs it. A TrustedScriptURL is typed as the
 * string it was made from: the DOM's types know no Trusted Types, and every sink that
 * takes one takes that string in a browser without them.
 */
export interface TrustedTypePolicyFactory {
  createPolicy: (
    name: string,
    rules: { createScriptURL: (url: string) => string },
  ) => { createScriptURL: (url: string) => string };
}

/**
 * The worker's address as `register` must have it. Under `require-trusted-types-for
 * 'script'` a browser refuses a plain string there, and only a policy the CSP names can
 * make a TrustedScriptURL; this one makes the worker's and throws on anything else. A
 * browser without Trusted Types takes the string. Built once per page, because a policy
 * name can be created only once.
 */
export const createWorkerURL = (factory: TrustedTypePolicyFactory | undefined): (() => string) => {
  if (!factory) return () => SERVICE_WORKER_URL;
  const policy = factory.createPolicy(TRUSTED_TYPES_POLICY, {
    createScriptURL: (url) => {
      if (url !== SERVICE_WORKER_URL) throw new TypeError(`${TRUSTED_TYPES_POLICY}: ${url}`);
      return url;
    },
  });
  return () => policy.createScriptURL(SERVICE_WORKER_URL);
};

let workerURL: (() => string) | null = null;

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
 * hanging. Registering is idempotent, so every app sharing the worker's scope can call
 * this without knowing whether another app registered it first.
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
      workerURL ??= createWorkerURL(
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the DOM's types have no Trusted Types; a browser without them leaves this undefined
        (globalThis as { trustedTypes?: TrustedTypePolicyFactory }).trustedTypes,
      );
      await container.register(workerURL(), { type: "module" });
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

/** A drop-in `fetch` that waits once per page for the worker, then fetches. */
export const controlledFetch: typeof fetch = async (input, init) => {
  controlled ??= whenControlled(
    typeof navigator === "undefined" ? undefined : navigator.serviceWorker,
  );
  if (!(await controlled)) controlled = null;
  return fetch(input, init);
};
