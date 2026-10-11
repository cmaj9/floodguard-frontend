import { useState } from 'react';
import Modal from '../ui/Modal';
import type { Station } from '../../types';
import {
  AlertTriangleIcon,
  RadioIcon,
} from '../ui/Icons';

interface StationStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: Station | null;
  targetStatus: 'active' | 'offline';
  onConfirm: () => Promise<void>;
}

export default function StationStatusConfirmModal({
  isOpen,
  onClose,
  station,
  targetStatus,
  onConfirm,
}: StationStatusConfirmModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!station) return null;

  const isGoingOffline = targetStatus === 'offline';

  const handleConfirmClick = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span>{isGoingOffline ? 'ยืนยันการปิดบริการชั่วคราว' : 'ยืนยันการเปิดให้บริการ'}</span>
      <span
        className="tabular-nums font-mono"
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: isGoingOffline ? 'var(--color-warning, #F59E0B)' : 'var(--color-normal, #10B981)',
          padding: '2px 8px',
          borderRadius: 6,
          background: isGoingOffline ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
          border: isGoingOffline ? '1px solid rgba(245, 158, 11, 0.28)' : '1px solid rgba(16, 185, 129, 0.28)',
          letterSpacing: '0.03em',
        }}
      >
        {isGoingOffline ? 'Offline' : 'Online'}
      </span>
    </span>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="500px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary tactile-press"
            onClick={onClose}
            disabled={submitting}
            style={{
              minHeight: 44,
              padding: '0 20px',
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className={`btn-liquid-sweep tactile-press ${isGoingOffline ? 'btn-liquid-sweep-offline' : 'btn-liquid-sweep-online'}`}
            onClick={handleConfirmClick}
            disabled={submitting}
            style={{
              minHeight: 44,
              padding: '0 22px',
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {submitting
              ? 'กำลังดำเนินการ...'
              : isGoingOffline
              ? 'ยืนยันตั้งค่าออฟไลน์'
              : 'ยืนยันเปิดให้บริการ'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Station Target Badge */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 12,
            background: 'var(--card-surface, #15181E)',
            border: '1px solid var(--card-border, rgba(255, 255, 255, 0.1))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary, #94A3B8)', fontWeight: 500, lineHeight: 1.4, marginBottom: 2 }}>
              สถานีเป้าหมาย
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', lineHeight: 1.35, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>{station.name}</span>
              <span
                className="tabular-nums font-mono"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary, #94A3B8)',
                }}
              >
                ({station.deviceId || station.id})
              </span>
            </div>
          </div>
          <div
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.35,
              background: isGoingOffline ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isGoingOffline ? 'var(--color-warning, #F59E0B)' : 'var(--color-normal, #10B981)',
              border: `1px solid ${isGoingOffline ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isGoingOffline ? 'var(--color-warning, #F59E0B)' : 'var(--color-normal, #10B981)',
                flexShrink: 0,
              }}
            />
            <span>{isGoingOffline ? 'เปลี่ยนเป็น ออฟไลน์' : 'เปลี่ยนเป็น ออนไลน์'}</span>
          </div>
        </div>

        {isGoingOffline ? (
          /* Concise Offline Mode Message */
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.4,
                color: 'var(--color-warning, #F59E0B)',
              }}
            >
              <AlertTriangleIcon size={17} style={{ flexShrink: 0 }} />
              <span>ระงับการแจ้งเตือนและปิดแสดงผลชั่วคราว</span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary, #94A3B8)',
                lineHeight: 1.6,
              }}
            >
              ระบบจะหยุดส่งข้อความเตือนภัยทาง LINE OA และซ่อนค่าจากหน้าเว็บสาธารณะ (เซนเซอร์ยังคงบันทึกข้อมูลประวัติตามปกติ)
            </div>
          </div>
        ) : (
          /* Concise Online Mode Message */
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.4,
                color: 'var(--color-normal, #10B981)',
              }}
            >
              <RadioIcon size={17} style={{ flexShrink: 0 }} />
              <span>เปิดระบบตรวจวัดและเตือนภัย</span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-secondary, #94A3B8)',
                lineHeight: 1.6,
              }}
            >
              เริ่มส่งการแจ้งเตือนทาง LINE OA ตามเกณฑ์ และนำระดับน้ำขึ้นแสดงบนหน้าเว็บสาธารณะตามปกติ
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
