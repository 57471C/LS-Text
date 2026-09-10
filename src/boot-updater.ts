import { initUpdater } from "@/lib/ide/updater";
import { useIde } from "@/lib/ide/store";

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    try {
      initUpdater();
    } catch (e) {
      const msg = `[Updater] init failed: ${e instanceof Error ? e.message : String(e)}`;
      useIde.setState({ status: msg });
      const w = window as unknown as { showToast?: (msg: string, t: string) => void };
      if (typeof w.showToast === "function") {
        w.showToast(msg, "error");
      } else {
        console.warn("[Updater] init failed:", e);
      }
    }
  });
}
