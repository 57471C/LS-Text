import type { VirtualSnapshot } from "./types";

/** Browser-only empty workspace. Desktop hydrate mounts $HOME. */
export function createSeedSnapshot(): VirtualSnapshot {
  const root = "/scratchpad";
  return {
    name: "scratchpad",
    rootPath: root,
    dirs: [root],
    files: {},
  };
}
