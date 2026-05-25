/* LogoMark — matches the prototype's assets/logo-mark.svg description.
   A serif italic "Q" inside a thin amber square with an arrow accent. */

interface LogoMarkProps {
  size?: number;
}

export function LogoMark({ size = 22 }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <rect
        x="0.5" y="0.5" width="63" height="63"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1"
      />
      <text
        x="32" y="44"
        fontFamily="'Instrument Serif', Georgia, serif"
        fontSize="44"
        fill="var(--text-primary)"
        textAnchor="middle"
        fontStyle="italic"
      >
        Q
      </text>
      {/* Arrow accent — top-right corner */}
      <line x1="44" y1="46" x2="58" y2="32" stroke="var(--accent)" strokeWidth="2" />
      <line x1="58" y1="32" x2="58" y2="38" stroke="var(--accent)" strokeWidth="2" />
      <line x1="58" y1="32" x2="52" y2="32" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}
