import {
  CLAIM_MESSAGE,
  SERVICE_WORKER_URL,
  createWorkerURL,
  whenControlled,
} from "../src/util/service-worker";

import type { TrustedTypePolicyFactory, WorkerContainer } from "../src/util/service-worker";

interface FakeContainer extends WorkerContainer {
  controller: unknown;
  messages: unknown[];
  registered: string[];
  listeners: number;
  takeControl: () => void;
}

const fakeContainer = ({
  controlled = false,
  active = true,
  registerFails = false,
}: { controlled?: boolean; active?: boolean; registerFails?: boolean } = {}): FakeContainer => {
  const listeners = new Set<() => void>(),
    container: FakeContainer = {
      controller: controlled ? {} : null,
      messages: [],
      registered: [],
      get listeners() {
        return listeners.size;
      },
      ready: Promise.resolve({
        active: active
          ? { postMessage: (message: unknown) => container.messages.push(message) }
          : null,
      }),
      register: async (url) => {
        if (registerFails) throw new Error("refused");
        container.registered.push(url);
      },
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
      takeControl: () => {
        container.controller = {};
        for (const listener of listeners) listener();
      },
    };
  return container;
};

describe("waiting for the auth service worker", () => {
  it("resolves at once when the page is already controlled", async () => {
    const container = fakeContainer({ controlled: true });
    await expect(whenControlled(container)).resolves.toBe(true);
    expect(container.registered).toEqual([]);
  });

  it("registers the worker and asks it to claim an uncontrolled page", async () => {
    const container = fakeContainer(),
      result = whenControlled(container);
    await vi.waitFor(() => expect(container.messages).toEqual([CLAIM_MESSAGE]));
    expect(container.registered).toEqual([SERVICE_WORKER_URL]);
    container.takeControl();
    await expect(result).resolves.toBe(true);
    expect(container.listeners).toBe(0);
  });

  it("resolves when the worker takes control while it is still installing", async () => {
    const container = fakeContainer({ active: false }),
      result = whenControlled(container);
    container.takeControl();
    await expect(result).resolves.toBe(true);
  });

  it("gives up after the timeout when no worker takes control", async () => {
    const container = fakeContainer();
    await expect(whenControlled(container, 10)).resolves.toBe(false);
    expect(container.listeners).toBe(0);
  });

  it("gives up at once when registration is refused or unsupported", async () => {
    await expect(whenControlled(fakeContainer({ registerFails: true }))).resolves.toBe(false);
    await expect(whenControlled(undefined)).resolves.toBe(false);
  });
});

describe("the worker's address under Trusted Types", () => {
  // A stand-in for the browser's factory, marking what its policies make.
  let created: string[], rules: Parameters<TrustedTypePolicyFactory["createPolicy"]>[1] | undefined;
  const factory: TrustedTypePolicyFactory = {
    createPolicy: (name, given) => {
      created.push(name);
      rules = given;
      return { createScriptURL: (url) => `trusted ${given.createScriptURL(url)}` };
    },
  };

  beforeEach(() => {
    created = [];
    rules = undefined;
  });

  it("is made by the four-stroke policy", () => {
    const workerURL = createWorkerURL(factory);
    expect(created).toEqual(["four-stroke"]);
    expect(workerURL()).toBe(`trusted ${SERVICE_WORKER_URL}`);
  });

  it("is the only address the policy will make", () => {
    createWorkerURL(factory);
    expect(() => rules?.createScriptURL("https://example.com/worker.js")).toThrow(TypeError);
  });

  it("is the plain string in a browser without Trusted Types", () => {
    expect(createWorkerURL(undefined)()).toBe(SERVICE_WORKER_URL);
  });
});
