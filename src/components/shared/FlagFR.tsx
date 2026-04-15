/**
 * Inline SVG French flag — used instead of the 🇫🇷 emoji for consistent
 * rendering across platforms (iOS/Capacitor, Android, Windows).
 */
interface FlagFRProps {
  className?: string;
  /** Rendered height in px. Width is 3/2 of height (2:3 aspect ratio). */
  size?: number;
}

export function FlagFR({ className, size = 12 }: FlagFRProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3 2"
      width={(size * 3) / 2}
      height={size}
      className={className}
      aria-label="Drapeau français"
      role="img"
    >
      <rect width="1" height="2" x="0" fill="#0055A4" />
      <rect width="1" height="2" x="1" fill="#FFFFFF" />
      <rect width="1" height="2" x="2" fill="#EF4135" />
    </svg>
  );
}
