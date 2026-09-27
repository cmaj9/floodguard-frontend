import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import type { Station } from '../../types';
import { AlertTriangleIcon, Trash2Icon } from '../ui/Icons';

interface StationDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: Station | null;
  onConfirm: (stationId: string) => Promise<void>;
}

export default function StationDeleteModal({
  isOpen,
  onClose,
  station,
  onConfirm,
}: StationDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens or station changes
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setIsDeleting(false);
      setError(null);
    }
  }, [isOpen, station]);

  if (!station) return null;

  const targetName = (station.name || '').trim();
  const targetId = (station.id || '').trim();

  // Match either exact station name or station ID for flexible and safe user confirmation
  const isMatch =
    confirmText.trim() === targetName ||
    confirmText.trim() === targetId;

  const handleDelete = async () => {
    if (!isMatch || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(station.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการลบสถานี');
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
            }}
          >
            <Trash2Icon size={18} />
          </div>
          <span>ยืนยันการลบสถานีตรวจวัด</span>
        </div>
      }
      subtitle="การดำเนินการนี้จะลบข้อมูลออกจากฐานข้อมูลอย่างถาวร"
      maxWidth="540px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={isDeleting}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            style={{
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 700,
              background: isMatch ? '#EF4444' : 'rgba(239, 68, 68, 0.3)',
              color: '#FFFFFF',
              border: 'none',
              cursor: isMatch && !isDeleting ? 'pointer' : 'not-allowed',
              opacity: isMatch ? 1 : 0.6,
              transition: 'all 0.18s ease',
            }}
          >
            {isDeleting ? 'กำลังลบสถานี...' : 'ยืนยันลบสถานีถาวร'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Error Banner */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#EF4444',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {/* Station Target Info Card */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>
              {station.name || 'ไม่ระบุชื่อสถานี'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {station.location || 'ไม่มีข้อมูลสถานที่'}
            </div>
          </div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'monospace',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#94A3B8',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            {station.id}
          </span>
        </div>

        {/* Danger Warning Box */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <AlertTriangleIcon size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12.5, color: '#F87171', lineHeight: 1.5 }}>
            <strong>คำเตือน:</strong> การดำเนินการนี้ไม่สามารถยกเลิกได้ ประวัติการวัดระดับน้ำ การแจ้งเตือน และการเชื่อมต่อเซนเซอร์ทั้งหมดของสถานีนี้จะถูกลบออกจากระบบอย่างถาวร
          </div>
        </div>

        {/* Safety Verification Input */}
        <div>
          <label
            htmlFor="delete-confirm-input"
            style={{
              fontSize: 13,
              color: 'var(--text-primary)',
              display: 'block',
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            เพื่อยืนยันความปลอดภัย กรุณาพิมพ์ชื่อสถานี{' '}
            <strong style={{ color: '#EF4444', userSelect: 'all' }}>
              "{targetName || targetId}"
            </strong>{' '}
            ในช่องด้านล่าง:
          </label>
          <input
            id="delete-confirm-input"
            className="input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`พิมพ์ ${targetName || targetId} เพื่อยืนยัน`}
            disabled={isDeleting}
            autoFocus
            style={{
              width: '100%',
              fontSize: 14,
              padding: '10px 14px',
              borderRadius: 8,
              border: isMatch
                ? '1px solid #EF4444'
                : '1px solid var(--card-border)',
              boxShadow: isMatch ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
