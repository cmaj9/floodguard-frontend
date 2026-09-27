import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { StationWithReading } from '../types';
import {
  fetchStations,
  fetchSubscriberPreferences,
  saveSubscriberPreferences,
} from '../services/apiService';
import {
  BellIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  MapPinIcon,
  MapIcon,
  ShieldCheckIcon,
} from '../components/ui/Icons';

export default function SubscribePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialUid = searchParams.get('uid') || '';
  const [lineUserId, setLineUserId] = useState<string>(initialUid);
  const [displayName, setDisplayName] = useState<string>('');
  const [stations, setStations] = useState<StationWithReading[]>([]);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]);
  const [selectedAlertTypes, setSelectedAlertTypes] = useState<string[]>([
    'water_level',
    'rate_of_rise',
  ]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load available stations and existing subscriber preferences
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const stationList = await fetchStations();
        setStations(stationList);

        // If lineUserId is provided in URL, fetch existing subscriptions
        if (initialUid) {
          try {
            const prefs = await fetchSubscriberPreferences(initialUid);
            if (prefs) {
              if (prefs.display_name) setDisplayName(prefs.display_name);
              if (Array.isArray(prefs.station_ids) && prefs.station_ids.length > 0) {
                setSelectedStationIds(prefs.station_ids);
              } else {
                // By default select all active stations
                setSelectedStationIds(
                  stationList.filter((s) => s.status === 'active').map((s) => s.station_id)
                );
              }
            }
          } catch {
            // New user, select active stations by default
            setSelectedStationIds(
              stationList.filter((s) => s.status === 'active').map((s) => s.station_id)
            );
          }
        } else {
          // Default all active
          setSelectedStationIds(
            stationList.filter((s) => s.status === 'active').map((s) => s.station_id)
          );
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'ไม่สามารถโหลดข้อมูลสถานีได้');
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, [initialUid]);

  const handleToggleStation = (stationId: string) => {
    setSelectedStationIds((prev) =>
      prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId]
    );
  };

  const handleSelectAll = () => {
    const allActiveIds = stations.filter((s) => s.status === 'active').map((s) => s.station_id);
    setSelectedStationIds(allActiveIds);
  };

  const handleDeselectAll = () => {
    setSelectedStationIds([]);
  };

  const handleToggleAlertType = (type: string) => {
    setSelectedAlertTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUserId.trim()) {
      setErrorMessage('กรุณาระบุ LINE User ID เพื่อผูกกับระบบการแจ้งเตือน');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSavedSuccess(false);

    try {
      await saveSubscriberPreferences({
        line_user_id: lineUserId.trim(),
        display_name: displayName.trim() || undefined,
        station_ids: selectedStationIds,
      });
      setSavedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(err.message || 'บันทึกข้อมูลการติดตามไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #0d1a33 0%, #080C14 70%)',
        color: 'var(--text-primary)',
        padding: '32px 16px 80px',
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Top Branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: 'var(--color-primary)',
              marginBottom: 16,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            <BellIcon size={28} />
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 8px 0',
              background: 'linear-gradient(to right, #FFFFFF, #94A3B8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ตั้งค่าการแจ้งเตือน WaterWatch
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            รับการแจ้งเตือนระดับน้ำและสถานการณ์น้ำท่วมเรียลไทม์ผ่าน LINE Official Account
          </p>
        </div>

        {/* Success Banner */}
        {savedSuccess && (
          <div
            className="card"
            style={{
              marginBottom: 24,
              padding: '20px 24px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircleIcon size={24} style={{ color: '#10B981', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#10B981' }}>
                  บันทึกการตั้งค่าการติดตามเรียบร้อยแล้ว
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  ระบบจะส่งข้อความแจ้งเตือนสถานการณ์น้ำของสถานีที่ท่านเลือกผ่านทาง LINE ทันทีเมื่อมีเหตุเฝ้าระวังหรือวิกฤต
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/dashboard')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <MapIcon size={14} />
                <span>เปิดดูแดชบอร์ดระดับน้ำ</span>
              </button>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div
            style={{
              marginBottom: 24,
              padding: '14px 18px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 14,
            }}
          >
            <AlertTriangleIcon size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* User Account Info Card */}
          <div
            className="card"
            style={{
              marginBottom: 20,
              padding: '20px 24px',
              background: 'rgba(17, 24, 39, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <ShieldCheckIcon size={18} style={{ color: 'var(--color-primary)' }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>ข้อมูลบัญชีผู้รับการแจ้งเตือน</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label
                  htmlFor="line-user-id"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}
                >
                  LINE User ID
                </label>
                <input
                  id="line-user-id"
                  type="text"
                  className="form-input"
                  value={lineUserId}
                  onChange={(e) => setLineUserId(e.target.value)}
                  placeholder="เช่น U1234567890abcdef..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 14,
                    fontFamily: 'monospace',
                    borderRadius: 8,
                  }}
                  required
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, margin: 0 }}>
                  รหัสผู้ใช้ LINE ที่ผูกกับระบบ (หากเปิดจากลิงก์ใน LINE ระบบจะกรอกให้อัตโนมัติ)
                </p>
              </div>

              <div>
                <label
                  htmlFor="display-name"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}
                >
                  ชื่อเรียก หรือชื่อที่ต้องการแสดง (ไม่บังคับ)
                </label>
                <input
                  id="display-name"
                  type="text"
                  className="form-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น คุณสมชาย หรือ ประชาชน ม.3"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 14,
                    borderRadius: 8,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Station Selection Card */}
          <div
            className="card"
            style={{
              marginBottom: 20,
              padding: '20px 24px',
              background: 'rgba(17, 24, 39, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>
                  เลือกสถานีที่ต้องการรับการแจ้งเตือน
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  เลือกเฉพาะสถานีในพื้นที่ที่ท่านต้องการเฝ้าระวัง ({selectedStationIds.length}/{stations.length} สถานี)
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                >
                  เลือกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                >
                  ยกเลิกทั้งหมด
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                กำลังโหลดรายชื่อสถานี...
              </div>
            ) : stations.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                ไม่พบข้อมูลสถานีในระบบ
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stations.map((st) => {
                  const isSelected = selectedStationIds.includes(st.station_id);
                  const isOffline = st.status !== 'active';
                  const refName = st.reference_point_name || 'จุดอ้างอิง';

                  return (
                    <div
                      key={st.station_id}
                      onClick={() => !isOffline && handleToggleStation(st.station_id)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: isSelected
                          ? 'rgba(6, 182, 212, 0.08)'
                          : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected
                          ? '1px solid rgba(6, 182, 212, 0.35)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: isOffline ? 'not-allowed' : 'pointer',
                        opacity: isOffline ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 14,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            border: isSelected
                              ? '2px solid var(--color-primary)'
                              : '2px solid rgba(148, 163, 184, 0.4)',
                            background: isSelected ? 'var(--color-primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: '#fff',
                            transition: '0.15s',
                          }}
                        >
                          {isSelected && <CheckCircleIcon size={14} />}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{st.station_name}</span>
                            <span
                              style={{
                                fontSize: 11,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: 'rgba(56, 189, 248, 0.1)',
                                color: '#38BDF8',
                              }}
                            >
                              {refName}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <MapPinIcon size={12} />
                            <span>{st.location_name || 'ไม่ระบุพิกัด'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div>
                        {isOffline ? (
                          <span
                            style={{
                              fontSize: 11,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: 'rgba(148, 163, 184, 0.12)',
                              color: 'var(--text-muted)',
                              border: '1px solid rgba(148, 163, 184, 0.25)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ปิดบริการชั่วคราว
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#10B981',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            พร้อมให้บริการ
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Alert Categories Selection Card */}
          <div
            className="card"
            style={{
              marginBottom: 24,
              padding: '20px 24px',
              background: 'rgba(17, 24, 39, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>ประเภทเหตุการณ์ที่ต้องการรับแจ้ง</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
              เลือกเงื่อนไขที่ต้องการให้ LINE ส่งข้อความหาท่าน
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedAlertTypes.includes('water_level')}
                  onChange={() => handleToggleAlertType('water_level')}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    ระดับน้ำเข้าใกล้จุดเฝ้าระวังหรือจุดวิกฤต
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    แจ้งเตือนเมื่อระดับน้ำเพิ่มสูงจนถึงเกณฑ์ความปลอดภัยของตลิ่งหรือจุดอ้างอิง
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedAlertTypes.includes('rate_of_rise')}
                  onChange={() => handleToggleAlertType('rate_of_rise')}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    ระดับน้ำเพิ่มขึ้นฉับพลัน (Rate of Rise)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    แจ้งเตือนล่วงหน้าเมื่อน้ำไหลบ่ารวดเร็วกว่าปกติ เพื่อให้เตรียมพร้อมรับมือน้ำหลาก
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={submitting || selectedStationIds.length === 0}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px 24px',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
            }}
          >
            <BellIcon size={18} />
            <span>{submitting ? 'กำลังบันทึกการตั้งค่า...' : 'บันทึกการตั้งค่าการแจ้งเตือน'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
