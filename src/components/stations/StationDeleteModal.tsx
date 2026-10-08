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

  // Match exact station name for safety confirmation
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              flexShrink: 0,
            }}
          >
            <Trash2Icon size={20} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
            ยืนยันการลบสถานีตรวจวัด
          </div>
        </div>
      }
      maxWidth="420px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
            style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8 }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            style={{
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              background: isMatch ? '#EF4444' : 'rgba(239, 68, 68, 0.2)',
              color: isMatch ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
              border: 'none',
              cursor: isMatch && !isDeleting ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.18s ease',
            }}
          >
            <Trash2Icon size={15} />
            <span>{isDeleting ? 'กำลังลบ...' : 'ยืนยันลบ'}</span>
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Hero Card: Prominent Station ID + Large 20px Station Name */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: 12,
            background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: 6,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                letterSpacing: '0.05em',
              }}
            >
              {targetId}
            </span>
            {station.location && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {station.location}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}
          >
            {targetName || targetId}
          </div>
        </div>

        {/* Verification Input */}
        <div>
          <label
            htmlFor="delete-confirm-input"
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            พิมพ์ชื่อสถานี <strong style={{ color: '#EF4444', userSelect: 'all' }}>"{targetName}"</strong> เพื่อยืนยัน:
          </label>
          <input
            id="delete-confirm-input"
            className="input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`พิมพ์ ${targetName} เพื่อยืนยัน`}
            disabled={isDeleting}
            autoFocus
            style={{
              width: '100%',
              fontSize: 14,
              padding: '10px 14px',
              borderRadius: 8,
              border: isMatch
                ? '1px solid #EF4444'
                : '1px solid var(--border)',
              boxShadow: isMatch ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
