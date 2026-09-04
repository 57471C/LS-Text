/** One-shot latch so a confirmed quit is not intercepted again. */
let allowNativeClose = false;

export function shouldAllowNativeClose() {
  return allowNativeClose;
}

export function hasQuitWorthyTabs(
  tabs: { isUntitled: boolean; content: string; originalContent: string }[],
) {
  return tabs.some((tab) => {
    if (tab.content === tab.originalContent) return false;
    if (tab.isUntitled && tab.content.trim() === "") return false;
    return true;
  });
}

export async function forceNativeClose() {
  allowNativeClose = true;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().close();
}
