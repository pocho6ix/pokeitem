// @capacitor/share is not installed — using Web Share API + clipboard fallback

export async function shareProfile(slug: string, displayName: string, onCopied?: () => void) {
  const url = `https://app.pokeitem.fr/u/${slug}`;
  const text = `Regarde mon classeur Pokémon sur Pokéitem`;

  // Try Capacitor if available (native app)
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      try {
        const { Share } = await import("@capacitor/share");
        await Share.share({ title: "Mon classeur Pokéitem", text, url, dialogTitle: "Partager mon classeur" });
        return;
      } catch { /* user cancelled */ }
      return;
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
