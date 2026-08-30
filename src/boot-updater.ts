import { initUpdater } from "@/lib/ide/updater";

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    try {
      initUpdater();
    } catch (e) {
      console.warn("[Updater] init failed:", e);
    }
  });
}
