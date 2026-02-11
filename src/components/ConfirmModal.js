import React from 'react';

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
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{
          maxWidth: '460px',
          padding: '26px',
          border: danger ? '2px solid #ff3333' : '2px solid #1a1a1a'
        }}
      >
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>
            {title}
          </div>
          <div style={{ fontSize: '13px', color: '#888888', marginTop: '6px' }}>
            {message}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onCancel}>
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
