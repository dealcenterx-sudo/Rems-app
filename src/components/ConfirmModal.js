import React, { useEffect, useId, useRef } from 'react';
import useEscapeKey from '../utils/useEscapeKey';

const ConfirmModal = ({
  open,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel
}) => {
  const cancelRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  // Escape and outside-click both mean "cancel" — the safe default.
  useEscapeKey(onCancel, open);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          padding: '26px',
          border: danger ? '2px solid #ff3333' : '2px solid #1a1a1a'
        }}
      >
        <div style={{ marginBottom: '14px' }}>
          <div id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>
            {title}
          </div>
          <div id={messageId} style={{ fontSize: '13px', color: '#888888', marginTop: '6px' }}>
            {message}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button ref={cancelRef} className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
