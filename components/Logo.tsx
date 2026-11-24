/** Four-leaf mark built from the brand palette: a 2×2 of rounded "slices". */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="2" y="2" width="13" height="13" rx="6.5" ry="6.5" fill="#336b57" style={{ borderRadius: 0 }} />
      <path d="M17 2h6.5A6.5 6.5 0 0 1 30 8.5V15H17z" fill="#336b57" />
      <path d="M2 17h13v13H8.5A6.5 6.5 0 0 1 2 23.5z" fill="#336b57" />
      <rect x="17" y="17" width="13" height="13" rx="6.5" fill="#9a803c" />
    </svg>
  );
}
