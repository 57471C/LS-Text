import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IdeShell } from "@/components/ide/IdeShell";
import "./styles.css";

function revealWindow() {
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown };
  if (!w.__TAURI_INTERNALS__ && !w.__TAURI__) return;
  void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
    void getCurrentWindow().show();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IdeShell />
  </StrictMode>,
);

requestAnimationFrame(() => {
  requestAnimationFrame(revealWindow);
});
window.setTimeout(revealWindow, 800);
