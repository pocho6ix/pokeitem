/**
 * Returns a deterministic default avatar path based on the user ID.
 * Picks one of the 3 starter Pokémon: Dracaufeu, Tortank, Florizarre.
 */
const DEFAULT_AVATARS = [
  "/images/pokemon/dracaufeu.png",
  "/images/pokemon/tortank.png",
  "/images/pokemon/florizarre.png",
] as const;

export function getDefaultAvatar(userId: string): string {
  // Simple deterministic hash: sum char codes mod 3
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash += userId.charCodeAt(i);
  }
  return DEFAULT_AVATARS[hash % DEFAULT_AVATARS.length];
}
