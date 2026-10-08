interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showSubtitle = true, className = '' }: LogoProps) {
  const config = {
    sm: { font: 16, sub: 10 },
    md: { font: 20, sub: 11 },
    lg: { font: 26, sub: 12.5 },
    xl: { font: 34, sub: 14 },
  }[size];

  return (
    <div
      className={`logo-wrap ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        textAlign: 'left',
      }}
    >
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
  );
}
