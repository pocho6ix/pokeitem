// @capacitor/share is not installed — using Web Share API + clipboard fallback
// To add native share: install @capacitor/core and @capacitor/share

export async function shareProfile(slug: string, _displayName: string, onCopied?: () => void) {
  const url = `https://app.pokeitem.fr/u/${slug}`;
  const text = `Regarde mon classeur Pokémon sur Pokéitem`;

  // Try Capacitor if available (native app) — dynamic import so it doesn't break web builds
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capModule = await import("@capacitor/core" as any).catch(() => null);
    if (capModule?.Capacitor?.isNativePlatform?.()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shareModule = await import("@capacitor/share" as any).catch(() => null);
      if (shareModule?.Share) {
        await shareModule.Share.share({ title: "Mon classeur Pokéitem", text, url, dialogTitle: "Partager mon classeur" }).catch(() => {});
        return;
      }
    }
  } catch { /* @capacitor/core not installed */ }

  // Web Share API
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "Mon classeur Pokéitem", text, url });
      return;
    } catch { /* cancelled */ }
    return;
  }

  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(url);
  } catch { /* ignore */ }
  onCopied?.();
}
