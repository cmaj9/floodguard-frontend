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

  const modalTitle = isGoingOffline
    ? 'ยืนยันการปิดบริการชั่วคราว (Offline)'
    : 'ยืนยันการเปิดให้บริการ (Online)';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="500px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={submitting}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className={`btn-liquid-sweep ${isGoingOffline ? 'btn-liquid-sweep-offline' : 'btn-liquid-sweep-online'}`}
            onClick={handleConfirmClick}
            disabled={submitting}
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
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>สถานีเป้าหมาย</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {station.name} ({station.id})
            </div>
          </div>
          <div
            style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 700,
              background: isGoingOffline ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isGoingOffline ? '#F59E0B' : '#10B981',
              border: `1px solid ${isGoingOffline ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            }}
          >
            {isGoingOffline ? 'เปลี่ยนเป็น ออฟไลน์' : 'เปลี่ยนเป็น ออนไลน์'}
          </div>
        </div>

        {isGoingOffline ? (
          /* Concise Offline Mode Message */
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#F59E0B',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5 }}>
              <AlertTriangleIcon size={18} />
              <span>ระงับการแจ้งเตือนและปิดแสดงผลชั่วคราว</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
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
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10B981',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 13.5 }}>
              <RadioIcon size={18} />
              <span>เปิดระบบตรวจวัดและเตือนภัย</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              เริ่มส่งการแจ้งเตือนทาง LINE OA ตามเกณฑ์ และนำระดับน้ำขึ้นแสดงบนหน้าเว็บสาธารณะตามปกติ
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
