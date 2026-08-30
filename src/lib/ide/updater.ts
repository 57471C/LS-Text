/**
 * LS.Text auto-update (suite updater pattern).
 *
 * Toast: Cancel | Now | When I close
 * - Now → downloadAndInstall + relaunch
 * - When I close → background download, install on window close
 *
 * Uses withGlobalTauri surfaces (window.__TAURI__.updater / .process / .window)
 * with graceful fallback to plugin imports.
 * Silent no-op outside the desktop shell or when already on latest.
 */

import { check as checkUpdate, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { getCurrentWindow } from "@tauri-apps/api/window";

const UPDATE_TOAST_ID = "lstext-update-toast";
const DOWNLOAD_TOAST_ID = "lstext-update-download-toast";

let pendingUpdateRef: Update | null = null;
let isUpdateReadyToInstall = false;
let isDownloadingUpdate = false;
let isApplyingDeferredUpdate = false;
let closeGuardAttached = false;

function isTauriEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown };
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
}

function removeEl(id: string) {
  document.getElementById(id)?.remove();
}

function hostContainer(): HTMLElement {
  let host = document.getElementById("toastContainer");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastContainer";
    host.className =
      "fixed z-[9999] flex flex-col gap-2 w-full max-w-md pointer-events-none px-4 items-end";
    host.style.cssText =
      "top: auto !important; bottom: 1.5rem !important; left: auto !important; right: 1.5rem !important;";
    document.body.appendChild(host);
  }
  return host;
}

function notify(message: string, type: "info" | "success" | "error" = "info") {
  const w = window as unknown as { showToast?: (msg: string, t: string) => void };
  if (typeof w.showToast === "function") {
    w.showToast(message, type);
  } else {
    console.log(`[Updater] ${message}`);
  }
}

function showUpdateToast(update: Update) {
  removeEl(UPDATE_TOAST_ID);
  const host = hostContainer();
  const version = update.version || "?";

  const card = document.createElement("div");
  card.id = UPDATE_TOAST_ID;
  card.className =
    "pointer-events-auto max-w-sm w-full rounded-xl border shadow-2xl p-4 flex flex-col gap-3 bg-white/95 dark:bg-zinc-900/95 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 font-sans";
  card.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex h-8 w-8 shrink-0 rounded-lg items-center justify-center text-sm bg-blue-500/15 text-blue-600 dark:text-blue-400">⚡</div>
      <div class="flex flex-col min-w-0">
        <p class="text-[12px] font-bold uppercase tracking-wider">Update Available</p>
        <p class="text-[10px] font-medium mt-1 leading-normal text-zinc-500 dark:text-zinc-400">
          LS.Text v${version} is ready to install.
        </p>
      </div>
    </div>
    <div class="flex gap-2 justify-end flex-wrap">
      <button type="button" data-act="cancel"
        class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors">
        Cancel
      </button>
      <button type="button" data-act="now"
        class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors">
        Now
      </button>
      <button type="button" data-act="later"
        class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors">
        When I close
      </button>
    </div>
  `;

  card.querySelector('[data-act="cancel"]')?.addEventListener("click", () => {
    removeEl(UPDATE_TOAST_ID);
  });

  card.querySelector('[data-act="now"]')?.addEventListener("click", () => {
    void installNow(update);
  });

  card.querySelector('[data-act="later"]')?.addEventListener("click", () => {
    void downloadForLater(update);
  });

  host.appendChild(card);
}

function showDownloadProgress(pct: number) {
  let card = document.getElementById(DOWNLOAD_TOAST_ID);
  if (!card) {
    const host = hostContainer();
    card = document.createElement("div");
    card.id = DOWNLOAD_TOAST_ID;
    card.className =
      "pointer-events-auto w-64 rounded-xl border shadow-2xl p-4 flex flex-col gap-2 bg-white/95 dark:bg-zinc-900/95 border-zinc-200 dark:border-zinc-700 font-sans";
    card.innerHTML = `
      <p class="text-[12px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-100">Downloading Update</p>
      <div class="h-1.5 w-full rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
        <div data-bar class="h-full bg-blue-500 transition-all duration-300" style="width:0%"></div>
      </div>
      <p data-pct class="text-[10px] font-medium text-right text-zinc-500 dark:text-zinc-400">0%</p>
    `;
    host.appendChild(card);
  }
  const bar = card.querySelector<HTMLElement>("[data-bar]");
  const label = card.querySelector("[data-pct]");
  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}%`;
}

async function installNow(update: Update) {
  removeEl(UPDATE_TOAST_ID);
  notify("Applying update and relaunching…", "info");
  try {
    if (typeof (update as { downloadAndInstall?: () => Promise<void> }).downloadAndInstall === "function") {
      await (update as { downloadAndInstall: () => Promise<void> }).downloadAndInstall();
    } else {
      await update.download();
      await update.install();
    }
    try {
      await relaunch();
    } catch {
      notify("Update installed — please restart LS.Text.", "success");
    }
  } catch (err) {
    console.error("[Updater] install now failed:", err);
    notify("Update failed", "error");
  }
}

async function downloadForLater(update: Update) {
  removeEl(UPDATE_TOAST_ID);
  if (isDownloadingUpdate) return;
  isDownloadingUpdate = true;
  notify("Downloading update in background…", "info");
  showDownloadProgress(0);

  try {
    let contentLength = 0;
    let downloaded = 0;

    await update.download((event) => {
      if (!event) return;
      const ev = event as { event?: string; data?: { contentLength?: number; chunkLength?: number } };
      const kind = ev.event || (event as unknown as string);
      if (kind === "Started") {
        contentLength = ev.data?.contentLength || 0;
        downloaded = 0;
        showDownloadProgress(0);
      } else if (kind === "Progress") {
        downloaded += ev.data?.chunkLength || 0;
        if (contentLength > 0) {
          showDownloadProgress(
            Math.min(100, Math.round((downloaded / contentLength) * 100)),
          );
        }
      } else if (kind === "Finished") {
        showDownloadProgress(100);
      }
    });

    pendingUpdateRef = update;
    isUpdateReadyToInstall = true;
    isDownloadingUpdate = false;
    removeEl(DOWNLOAD_TOAST_ID);
    notify("Update ready — will install when you close.", "success");
    attachCloseGuard();
  } catch (err) {
    console.error("[Updater] background download failed:", err);
    isDownloadingUpdate = false;
    pendingUpdateRef = null;
    isUpdateReadyToInstall = false;
    removeEl(DOWNLOAD_TOAST_ID);
    notify("Update download failed", "error");
  }
}

function attachCloseGuard() {
  if (closeGuardAttached) return;
  if (!isTauriEnvironment()) return;

  try {
    const appWindow = getCurrentWindow();
    if (!appWindow || typeof appWindow.onCloseRequested !== "function") return;

    closeGuardAttached = true;
    void appWindow.onCloseRequested(async (event) => {
      if (!isUpdateReadyToInstall || !pendingUpdateRef) return;

      isUpdateReadyToInstall = false;
      const updateRef = pendingUpdateRef;
      pendingUpdateRef = null;
      isApplyingDeferredUpdate = true;

      try {
        event.preventDefault();
      } catch {
        /* some platforms */
      }

      try {
        showApplyingOverlay();
        await updateRef.install();
        try {
          await relaunch();
        } catch {
          await appWindow.close();
        }
      } catch (err) {
        console.error("[Updater] deferred install failed:", err);
        isApplyingDeferredUpdate = false;
        hideApplyingOverlay();
        notify("Update install failed", "error");
      }
    });
  } catch (e) {
    console.warn("[Updater] attachCloseGuard failed:", e);
  }
}

function showApplyingOverlay() {
  if (document.getElementById("lstext-update-applying")) return;
  const el = document.createElement("div");
  el.id = "lstext-update-applying";
  el.className =
    "fixed inset-0 z-[10000] bg-black/80 flex flex-col items-center justify-center gap-3 font-sans";
  el.innerHTML = `
    <div class="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
    <p class="text-sm font-semibold text-zinc-200 tracking-wide uppercase">Installing update…</p>
  `;
  document.body.appendChild(el);
}

function hideApplyingOverlay() {
  document.getElementById("lstext-update-applying")?.remove();
}

/**
 * Run a background update check. Safe to call multiple times; no-ops in browser.
 */
export async function checkForApplicationUpdates(opts: { force?: boolean } = {}): Promise<void> {
  if (!isTauriEnvironment()) return;
  if (isDownloadingUpdate || isApplyingDeferredUpdate) return;

  if (!opts.force) {
    try {
      const pref = localStorage.getItem("lstext_check_updates_on_launch");
      if (pref === "0" || pref === "false") {
        console.log("[Updater] check skipped (disabled in preference)");
        return;
      }
    } catch {
      /* ignore */
    }
  }

  try {
    const update = await checkUpdate();
    if (!update) return;

    const version = update.version;
    if (!version) return;

    const rawJson = (update as unknown as { rawJson?: { critical?: boolean; forced?: boolean } }).rawJson;
    const isCritical = Boolean(rawJson?.critical || rawJson?.forced);

    if (isCritical) {
      notify(`Critical update v${version} — installing…`, "info");
      await installNow(update);
      return;
    }

    showUpdateToast(update);
  } catch (err) {
    console.warn("[Updater] background check:", err);
  }
}

/** Manual "Check for updates" from console or settings/help. */
export async function checkForUpdatesNow(): Promise<void> {
  await checkForApplicationUpdates({ force: true });
}

/**
 * Call once after DOM is ready (desktop shell only).
 */
export function initUpdater(): void {
  if (!isTauriEnvironment()) return;
  setTimeout(() => {
    void checkForApplicationUpdates();
  }, 2500);
}

declare global {
  interface Window {
    checkForUpdatesNow?: typeof checkForUpdatesNow;
    initUpdater?: typeof initUpdater;
  }
}

if (typeof window !== "undefined") {
  window.checkForUpdatesNow = checkForUpdatesNow;
  window.initUpdater = initUpdater;
}
