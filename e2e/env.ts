import path from "node:path";
import { fileURLToPath } from "node:url";

export const TEST_PORT = Number(process.env.FACET_TEST_PORT ?? 47321);
/**
 * The suite runs the unpacked Full (pinned key, wxt.config.ts): `jmholfbgnpfgojhhghiokddfmmcnpcke`.
 * SS fork: no store item; src/core/copies.ts holds only this one ID.
 */
export const EXTENSION_ID = "jmholfbgnpfgojhhghiokddfmmcnpcke";
export const EXTENSION_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.output/chrome-mv3",
);
export const at = (host: string, p = "/") => `http://${host}:${TEST_PORT}${p}`;
/** Address of a page of the extension. */
export const ext = (p: string) => `chrome-extension://${EXTENSION_ID}/${p}`;
