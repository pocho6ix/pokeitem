"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Runs the one-time native bootstrap when mounted inside the Capacitor
// WebView: locks the iOS status bar to dark and hides the splash screen
// once React has painted. All no-ops on the web.
//
// Push notifications are deliberately left out — the Xcode project
// doesn't yet have the `aps-environment` entitlement, and calling
// `register()` without it crashes the WKWebView content process on
// iOS 17+ (Apple hardened the error path). We re-enable it in one
// place once the capability is turned on.
export function NativeInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark });
        // setBackgroundColor is Android-only; the iOS native side ignores
        // it, but the plugin logs a warning — guard on platform.
        if (Capacitor.getPlatform() === "android") {
          await StatusBar.setBackgroundColor({ color: "#0A0F1E" });
        }
      } catch (err) {
        console.warn("[native] StatusBar init failed:", err);
      }

      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        // Give the first frame a moment to paint, then fade out. The
        // native config also has launchAutoHide: true as a fallback if
        // React never mounts (e.g. a JS error during hydration).
        await SplashScreen.hide({ fadeOutDuration: 200 });
      } catch (err) {
        console.warn("[native] SplashScreen hide failed:", err);
      }
    })();
  }, []);

  return null;
}
