"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Runs the one-time native bootstrap when mounted inside the Capacitor
// WebView: locks the iOS status bar to dark-on-transparent, hides the
// splash screen once React has painted, and requests push-notification
// permission (logging the device token so the backend can be wired up
// later). All no-ops on the web.
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
      } catch {}

      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        // Give the first frame a moment to paint, then fade out. The
        // native config also has launchAutoHide: true as a fallback if
        // React never mounts (e.g. a JS error during hydration).
        await SplashScreen.hide({ fadeOutDuration: 200 });
      } catch {}

      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive === "granted") {
          await PushNotifications.register();
        }
        PushNotifications.addListener("registration", (token) => {
          // Backend wiring comes later — for now just surface the token
          // in the native console so we can copy it during testing.
          console.log("[push] device token:", token.value);
        });
        PushNotifications.addListener("registrationError", (err) => {
          console.warn("[push] registration error:", err);
        });
      } catch {}
    })();
  }, []);

  return null;
}
