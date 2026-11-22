import { describe, expect, it, vi } from "vitest";
import type { browser } from "wxt/browser";

import { UNPACKED_FULL_ID } from "../core/copies";

/** A different extension ID, standing in for another copy in these tests. */
const OTHER_ID = "b".repeat(32);
import { createCopyDetector, registerCopyListeners } from "./copies";
import { createLogger } from "./log";

type Listener = (
  message: unknown,
  sender: { id?: string },
  sendResponse: (r: unknown) => void,
) => unknown;

/** A browser stub with the few members copies.ts touches. `peers`: what each other extension ID answers (absent: not there). */
function fakeBrowser(selfId: string, peers: Record<string, unknown> = {}) {
  const external: Listener[] = [];
  const started: Array<() => void> = [];
  const sent: Array<[string, unknown]> = [];
  const noop = { addListener: () => {} };
  const b = {
    runtime: {
      id: selfId,
      getManifest: () => ({ version: "0.1.4" }),
      onMessageExternal: { addListener: (l: Listener) => external.push(l) },
      onStartup: { addListener: (l: () => void) => started.push(l) },
      onInstalled: noop,
      sendMessage: async (id: string, message: unknown) => {
        sent.push([id, message]);
        if (!(id in peers))
          throw new Error(
            "Could not establish connection. Receiving end does not exist.",
          );
        return peers[id];
      },
    },
  } as unknown as typeof browser;
  return { b, external, started, sent };
}

const ask = (l: Listener, message: unknown, id?: string) => {
  const reply = vi.fn();
  const result = l(message, id === undefined ? {} : { id }, reply);
  return { reply, result };
};

describe("onMessageExternal listener", () => {
  it("answers the exact ping from a known ID with edition and version", () => {
    const { b, external } = fakeBrowser(UNPACKED_FULL_ID);
    registerCopyListeners(createCopyDetector(b), createLogger(), b);
    expect(external).toHaveLength(1);
    const { reply, result } = ask(
      external[0]!,
      { type: "splitsession.ping" },
      UNPACKED_FULL_ID,
    );
    expect(reply).toHaveBeenCalledExactlyOnceWith({
      type: "splitsession.pong",
      edition: "full",
      version: "0.1.4",
    });
    expect(result).toBe(false); // synchronous answer, channel not kept open
  });

  it("says nothing to an unknown sender or any other message", () => {
    const { b, external } = fakeBrowser(UNPACKED_FULL_ID);
    registerCopyListeners(createCopyDetector(b), createLogger(), b);
    for (const [message, id] of [
      [{ type: "splitsession.ping" }, "z".repeat(32)],
      [{ type: "splitsession.ping" }, undefined],
      [{ type: "facet/api", method: "listContainers", args: [] }, OTHER_ID],
      [{ type: "splitsession.ping", more: true }, OTHER_ID],
      ["splitsession.ping", OTHER_ID],
      [undefined, OTHER_ID],
    ] as Array<[unknown, string | undefined]>) {
      const { reply } = ask(external[0]!, message, id);
      expect(reply).not.toHaveBeenCalled();
    }
  });
});

describe("detection through the browser", () => {
  it("is none when the other copy is not there", async () => {
    const { b, sent } = fakeBrowser(UNPACKED_FULL_ID);
    expect(await createCopyDetector(b).get()).toEqual([]);
    expect(sent).toEqual([]); // only one known ID, and it is our own: nothing else to ping
  });

  it("finds no other copy: the only known ID is our own", async () => {
    const { b } = fakeBrowser(UNPACKED_FULL_ID, {
      [OTHER_ID]: {
        type: "splitsession.pong",
        edition: "lite",
        version: "0.1.3",
      },
    });
    expect(await createCopyDetector(b).get()).toEqual([]);
  });

  it("looks once when the browser starts and logs a warning when it finds a copy", async () => {
    const { b, started } = fakeBrowser(OTHER_ID, {
      [UNPACKED_FULL_ID]: {
        type: "splitsession.pong",
        edition: "full",
        version: "0.1.4",
      },
    });
    const log = createLogger();
    registerCopyListeners(createCopyDetector(b), log, b);
    started[0]!();
    await vi.waitFor(() =>
      expect(log.entries().map((e) => e.level)).toContain("warn"),
    );
  });
});
