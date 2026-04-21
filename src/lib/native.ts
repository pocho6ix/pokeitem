// Native platform detection + thin wrappers around Capacitor APIs.
//
// Every helper is safe to call on the web — it silently no-ops when
// `window.Capacitor` is not present — so feature code can use them
// unconditionally.

import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}
