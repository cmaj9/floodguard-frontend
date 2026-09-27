interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showSubtitle = true, className = '' }: LogoProps) {
  const dimensions = {
    sm: { font: 16, sub: 10.5 },
    md: { font: 20, sub: 11.5 },
    lg: { font: 26, sub: 13 },
    xl: { font: 34, sub: 14.5 },
  }[size];

  return (
    <div className={`logo-wrap ${className}`} style={{ display: 'inline-flex', flexDirection: 'column' }}>
      <div
        style={{
          fontSize: dimensions.font,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 45%, #818CF8 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.2,
        }}
      >
        FloodGuard
      </div>
      {showSubtitle && (
        <div style={{ fontSize: dimensions.sub, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500, letterSpacing: '0.01em' }}>
          ระบบเตือนภัยระดับน้ำอัจฉริยะ
        </div>
      )}
    </div>
  );
}
