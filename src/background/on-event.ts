/* eslint-disable @typescript-eslint/no-explicit-any -- the browser event types are only reachable through `any`: it lets each registration infer its own handler parameters */

type AnyListener = (...args: any[]) => unknown;
type Addable = { addListener(listener: AnyListener, ...rest: any[]): void };

/**
 * `event.addListener(listener, ...rest)` for any `chrome.*` event (listeners.ts, extras-listeners.ts).
 * No-op when the event does not exist: some Chromium forks (Mises Browser on Android) do not implement
 * `chrome.tabGroups`, `chrome.sessions` or `chrome.webNavigation` at all, and registering their listeners
 * unguarded throws at service-worker startup, which fails worker registration entirely.
 */
export const on = (event: unknown, listener: AnyListener, ...rest: unknown[]) => {
  if (!event || typeof (event as Addable).addListener !== "function") return;
  (event as Addable).addListener(listener, ...rest);
};
