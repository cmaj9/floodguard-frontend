import { useState } from 'react';
import Modal from '../ui/Modal';
import type { Station } from '../../types';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
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
    ? 'ยืนยันการตั้งค่าปิดบริการชั่วคราว (Offline)'
    : 'ยืนยันการเปิดให้บริการสถานี (Online)';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="560px"
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
            className="btn btn-sm"
            onClick={handleConfirmClick}
            disabled={submitting}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 700,
              background: isGoingOffline ? '#D97706' : '#10B981',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Station Target Badge */}
        <div
          style={{
            padding: '12px 16px',
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
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12,
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
          /* Detailed Explanation for Offline Mode */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <AlertTriangleIcon size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>โปรดตรวจสอบรายละเอียดก่อนยืนยันการตั้งค่าออฟไลน์</strong>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  เมื่อเปลี่ยนสถานะเป็นออฟไลน์ ระบบจะปรับการทำงานของสถานีนี้ดังต่อไปนี้
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                padding: '14px 16px',
              }}
            >
              {/* Point 1 */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38BDF8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    ค่ายังรับเข้าสู่ระบบเหมือนเดิม (Data Ingestion Continues)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    อุปกรณ์เซนเซอร์ภาคสนามยังคงส่งข้อมูลระดับน้ำ และระบบจะบันทึกค่าลงฐานข้อมูลตามปกติ ข้อมูลประวัติจะไม่สูญหาย
                  </div>
                </div>
              </div>

              {/* Point 2 */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    หน้าเว็บไม่แสดงค่า พร้อมแสดงสถานะปิดให้บริการ
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    หน้าแดชบอร์ดสาธารณะของประชาชนจะไม่นำค่าระดับน้ำไปแสดงผล และระบบจะขึ้นป้ายแจ้งสถานะว่าสถานีนี้ปิดให้บริการชั่วคราว
                  </div>
                </div>
              </div>

              {/* Point 3 */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    ระงับการแจ้งเตือนอัตโนมัติผ่าน LINE OA ทั้งหมด
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    ระบบตรวจจับการแจ้งเตือน (Alert Engine) จะหยุดส่งข้อความแจ้งเตือนทาง LINE สำหรับสถานีนี้ จนกว่าจะเปิดให้บริการอีกครั้ง
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Explanation for Online Mode */
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10B981',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 13,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <CheckCircleIcon size={18} />
              <span>เปิดให้บริการสถานีตรวจวัดตามปกติ</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              ค่าระดับน้ำจะกลับมาแสดงผลบนหน้าเว็บไซต์สาธารณะ และระบบจะเริ่มส่งการแจ้งเตือนผ่าน LINE OA ตามเกณฑ์ความปลอดภัยที่กำหนดไว้
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
