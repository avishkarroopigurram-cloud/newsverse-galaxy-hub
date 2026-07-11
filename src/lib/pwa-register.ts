// Guarded PWA service worker registration. Only registers in production on
// the real deployed origin — never in Lovable preview, dev, iframe, or when
// `?sw=off` is set. In any refused context, existing registrations are
// removed so a stale cache can't strand the app.

const APP_SW_PATH = "/sw.js";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;
  const h = url.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterAppSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        return url.endsWith(APP_SW_PATH);
      })
      .map((r) => r.unregister()),
  );
}

export function initPwa(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (isRefusedContext()) {
    void unregisterAppSW();
    return;
  }

  window.addEventListener("load", () => {
    void (async () => {
      try {
        const { Workbox } = await import("workbox-window");
        const wb = new Workbox(APP_SW_PATH);
        wb.addEventListener("waiting", () => {
          // A new version is ready — activate immediately.
          void wb.messageSkipWaiting();
        });
        wb.addEventListener("controlling", () => {
          window.location.reload();
        });
        await wb.register();
      } catch (err) {
        console.warn("[pwa] registration failed", err);
      }
    })();
  });
}
