import React, { useId, useRef } from 'react';
import useEscapeKey from '../utils/useEscapeKey';
import useFocusTrap from '../utils/useFocusTrap';
import { LoadingButton } from './Loading';

const ConfirmModal = ({
  open,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  confirming = false,
  pendingLabel,
  onConfirm,
  onCancel
}) => {
  const modalRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  // Escape and outside-click both mean "cancel" — the safe default.
  useEscapeKey(onCancel, open);
  // Trap Tab focus within the dialog; focuses the first control on open and
  // restores focus to the invoking element on close (pairs with useEscapeKey).
  useFocusTrap(modalRef, open);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={modalRef}
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        style={{
          maxWidth: '460px',
          padding: '26px',
          border: danger ? '2px solid var(--danger)' : '2px solid var(--skeleton-highlight)'
        }}
      >
        <div style={{ marginBottom: '14px' }}>
          <div id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--white)' }}>
            {title}
          </div>
          <div id={messageId} style={{ fontSize: '13px', color: 'var(--text-muted-2)', marginTop: '6px' }}>
            {message}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onCancel} disabled={confirming}>
            {cancelLabel}
          </button>
          <LoadingButton
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            loading={confirming}
            pendingLabel={pendingLabel || confirmLabel}
          >
            {confirmLabel}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
