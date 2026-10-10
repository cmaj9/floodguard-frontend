interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showIcon?: boolean;
  className?: string;
}

export default function Logo({
  size = 'md',
  showSubtitle = true,
  showIcon = true,
  className = '',
}: LogoProps) {
  const config = {
    sm: { font: 16, sub: 10, icon: 20, gap: 8 },
    md: { font: 20, sub: 11, icon: 24, gap: 10 },
    lg: { font: 26, sub: 12.5, icon: 30, gap: 12 },
    xl: { font: 34, sub: 14, icon: 38, gap: 14 },
  }[size];

  return (
    <div
      className={`logo-wrap ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: config.gap,
        textAlign: 'left',
      }}
    >
      {showIcon && (
        <svg
          width={config.icon}
          height={config.icon}
          viewBox="0 0 36 36"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
          aria-hidden="true"
        >
          <path d="M18 4V18L6 25" />
          <path d="M32 17L18 18L18 32" />
          <path d="M7 11L18 18L29 27" />
        </svg>
      )}

      <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
        {/* Brand Name */}
        <div
          style={{
            fontSize: config.font,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          <span style={{ color: '#FFFFFF' }}>Flood</span>
          <span style={{ color: '#38BDF8' }}>Guard</span>
        </div>

        {/* Subtitle */}
        {showSubtitle && (
          <div
            style={{
              fontSize: config.sub,
              color: '#94A3B8',
              marginTop: 2,
              fontWeight: 500,
              letterSpacing: '0.01em',
              lineHeight: 1.2,
            }}
          >
            ระบบเตือนภัยระดับน้ำอัจฉริยะ
          </div>
        )}
      </div>
    </div>
  );
}
