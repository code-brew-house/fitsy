export function FitsyLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="fitsy-badge-g"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      {/* Hexagonal badge */}
      <polygon
        points="20,1.5 35.5,10.5 35.5,29.5 20,38.5 4.5,29.5 4.5,10.5"
        fill="url(#fitsy-badge-g)"
      />
      {/* Subtle inner border */}
      <polygon
        points="20,4.5 33,12 33,28 20,35.5 7,28 7,12"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />
      {/* F — vertical bar */}
      <rect x="12" y="10" width="4" height="20" fill="white" rx="2" />
      {/* F — top horizontal bar */}
      <rect x="12" y="10" width="15" height="4" fill="white" rx="2" />
      {/* F — middle bar angled upward (rising momentum) */}
      <path d="M16 21 L27 15.5" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
