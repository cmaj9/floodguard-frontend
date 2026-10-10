import { RefreshCwIcon, CheckCircleIcon, AlertTriangleIcon, XCircleIcon } from '../ui/Icons';

interface SystemHeroBannerProps {
  totalStations: number;
  normalCount: number;
  warningCount: number;
  criticalCount: number;
  lastFetch: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function SystemHeroBanner({
  totalStations,
  warningCount,
  criticalCount,
  lastFetch,
  isLoading,
  onRefresh,
}: SystemHeroBannerProps) {
  // Determine overall readiness
  const isCritical = criticalCount > 0;
  const isAdvisory = !isCritical && warningCount > 0;

  const statusConfig = isCritical
    ? {
        themeClass: 'banner-critical',
        border: 'rgba(239, 68, 68, 0.4)',
        bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(12, 14, 18, 0.98) 100%)',
        beaconColor: '#EF4444',
        beaconPingColor: 'rgba(239, 68, 68, 0.4)',
        statusBadge: 'สภาวะวิกฤต',
        statusDesc: `ตรวจพบระดับน้ำสูงเกินเกณฑ์วิกฤต ${criticalCount} จุดตรวจวัด กรุณาปฏิบัติตามคำเตือนของหน่วยงานในพื้นที่`,
        icon: <XCircleIcon size={20} className="text-rose-500" style={{ color: '#EF4444' }} />,
        actionTone: '#EF4444',
      }
    : isAdvisory
    ? {
        themeClass: 'banner-advisory',
        border: 'rgba(245, 158, 11, 0.35)',
        bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(12, 14, 18, 0.98) 100%)',
        beaconColor: '#F59E0B',
        beaconPingColor: 'rgba(245, 158, 11, 0.35)',
        statusBadge: 'เฝ้าระวังระดับน้ำ',
        statusDesc: `มีจุดตรวจวัดระดับน้ำเข้าใกล้เกณฑ์เฝ้าระวัง ${warningCount} จุด ข้อมูลและแนวโน้มยังอยู่ภายใต้การควบคุม`,
        icon: <AlertTriangleIcon size={20} className="text-amber-500" style={{ color: '#F59E0B' }} />,
        actionTone: '#F59E0B',
      }
    : {
        themeClass: 'banner-normal',
        border: 'rgba(16, 185, 129, 0.25)',
        bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(12, 14, 18, 0.98) 100%)',
        beaconColor: '#10B981',
        beaconPingColor: 'rgba(16, 185, 129, 0.3)',
        statusBadge: 'ระบบเปิดให้บริการปกติ',
        statusDesc: `สถานการณ์น้ำทุกจุดตรวจวัด (${totalStations} สถานี) อยู่ในเกณฑ์ปลอดภัย ไม่มีแนวโน้มล้นตลิ่งใน 24 ชั่วโมงนี้`,
        icon: <CheckCircleIcon size={20} style={{ color: '#10B981' }} />,
        actionTone: '#10B981',
      };

  const formattedTime = lastFetch
    ? lastFetch.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'กำลังตรวจสอบ';

  return (
    <div
      className="bento-card"
      style={{
        background: statusConfig.bg,
        border: `1px solid ${statusConfig.border}`,
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem',
      }}
      role="region"
      aria-label="รายงานความพร้อมระบบและสถานการณ์ภาพรวม"
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Left Side: Beacon + Headline + Public Summary */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: 280 }}>
          {/* Active Pulsing Beacon */}
          <div
            style={{
              paddingTop: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="beacon-dot-wrap" title={`สถานะ ${statusConfig.statusBadge}`}>
              <span
                className="beacon-dot-ping"
                style={{ backgroundColor: statusConfig.beaconPingColor }}
              />
              <span
                className="beacon-dot-core"
                style={{ backgroundColor: statusConfig.beaconColor }}
              />
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: statusConfig.beaconColor,
                  background: `${statusConfig.beaconColor}18`,
                  padding: '0.2rem 0.625rem',
                  borderRadius: '9999px',
                  border: `1px solid ${statusConfig.beaconColor}33`,
                }}
              >
                {statusConfig.icon}
                {statusConfig.statusBadge}
              </span>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                ตรวจสอบข้อมูลอัตโนมัติทุก 30 วินาที
              </span>
            </div>

            <h1
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: '0.375rem',
                marginBottom: '0.25rem',
                lineHeight: 1.4,
              }}
            >
              ศูนย์ติดตามและเฝ้าระวังระดับน้ำสาธารณะ (FloodGuard Public Center)
            </h1>

            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {statusConfig.statusDesc}
            </p>
          </div>
        </div>

        {/* Right Side: Timestamp & Refresh Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginLeft: 'auto',
          }}
        >
          <div
            style={{
              textAlign: 'right',
              paddingRight: '0.5rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ข้อมูลล่าสุด</div>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
              }}
            >
              {formattedTime} น.
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="อัปเดตข้อมูลเดี๋ยวนี้"
            style={{
              fontSize: '0.8125rem',
              padding: '0.45rem 0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              borderRadius: '0.5rem',
              borderColor: 'var(--card-border)',
            }}
          >
            <RefreshCwIcon
              size={14}
              style={{
                animation: isLoading ? 'spin 0.8s linear infinite' : 'none',
                color: 'var(--cyan-glow)',
              }}
            />
            <span>{isLoading ? 'กำลังซิงค์...' : 'รีเฟรช'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
