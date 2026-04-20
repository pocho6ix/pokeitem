export async function shareProfile(slug: string, _displayName: string, onCopied?: () => void) {
  const url = `https://app.pokeitem.fr/u/${slug}`;
  const text = `Regarde mon classeur Pokémon sur Pokéitem`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "Mon classeur Pokéitem", text, url });
      return;
    } catch { /* cancelled */ }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
  } catch { /* ignore */ }
  onCopied?.();
}
