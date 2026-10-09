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
  const isMatch = confirmText.trim() === targetName;

  const handleDelete = async () => {
    if (!isMatch || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(station.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบสถานี');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              flexShrink: 0,
            }}
          >
            <Trash2Icon size={16} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>
            ยืนยันการลบสถานีตรวจวัด
          </span>
        </div>
      }
      maxWidth="420px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%', gap: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={isDeleting}
            style={{ padding: '6px 14px' }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            style={{
              padding: '6px 16px',
              fontSize: 12.5,
              fontWeight: 700,
              borderRadius: 6,
              background: isMatch ? '#EF4444' : 'rgba(239, 68, 68, 0.2)',
              color: isMatch ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
              border: 'none',
              cursor: isMatch && !isDeleting ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'all 0.15s ease',
            }}
          >
            <Trash2Icon size={13} />
            <span>{isDeleting ? 'กำลังลบ...' : 'ยืนยันลบสถานี'}</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#F87171',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AlertTriangleIcon size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Station Target Card */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span
              className="tabular-nums font-mono"
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              {targetId}
            </span>
            {station.location && (
              <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
                {station.location}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.3,
            }}
          >
            {targetName || targetId}
          </div>
        </div>

        {/* Safety Text Input */}
        <div>
          <label
            htmlFor="delete-confirm-input"
            style={{
              fontSize: 12.5,
              color: '#94A3B8',
              display: 'block',
              marginBottom: 6,
            }}
          >
            พิมพ์ชื่อสถานี <strong style={{ color: '#EF4444' }}>"{targetName}"</strong> เพื่อยืนยันการลบ
          </label>
          <input
            id="delete-confirm-input"
            className="input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`พิมพ์ ${targetName}`}
            disabled={isDeleting}
            autoFocus
            style={{
              width: '100%',
              fontSize: 13,
              padding: '8px 12px',
              borderRadius: 6,
              border: isMatch ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.1)',
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
