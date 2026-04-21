// Haptics feedback — thin wrapper around @capacitor/haptics.
//
// All helpers fail silently on the web (where navigator.vibrate is
// unreliable and users don't expect haptic feedback) and on any native
// device where the plugin throws. Feature code should call these
// unconditionally.

import { Capacitor } from "@capacitor/core";

async function lightImpact() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export const haptics = {
  /** Short tap — use for confirmed actions (add card, complete quest). */
  tap: lightImpact,
};
