export function BrandMark({ size = 32 }: { size?: number }): JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          background: 'linear-gradient(135deg, #0A0A0F 0%, #6D28D9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width={Math.round(size * 0.56)}
          height={Math.round(size * 0.56)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12 10 17 19 7" />
        </svg>
      </span>
      <span
        style={{
          fontWeight: 700,
          fontSize: Math.round(size * 0.53),
          color: '#0A0A0F',
          letterSpacing: '-0.01em',
        }}
      >
        Orcivo
      </span>
    </span>
  );
}
