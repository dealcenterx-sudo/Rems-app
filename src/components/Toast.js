import React, { createContext, useContext, useState, useCallback } from 'react';

// Icons
const CheckCircleIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const AlertCircleIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const InfoIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((message, duration) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const error = useCallback((message, duration) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  const info = useCallback((message, duration) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const Toast = ({ toast, onClose }) => {
  const { type, message } = toast;

  const config = {
    success: {
      icon: CheckCircleIcon,
      // bg alpha-suffixed (#00ff88 @ 0x15) has no byte-identical token; --accent-soft
      // is rgba(...,0.1) which differs — deferred to Pass 2 / plan 12 (RC-01).
      bg: '#00ff8815',
      border: 'var(--accent)',
      color: 'var(--accent)'
    },
    error: {
      icon: AlertCircleIcon,
      // bg alpha-suffixed (#ff3333 @ 0x15) has no byte-identical token; --danger-soft
      // is rgba(...,0.08) which differs — deferred to Pass 2 / plan 12 (RC-01).
      bg: '#ff333315',
      border: 'var(--danger)',
      color: 'var(--danger)'
    },
    info: {
      icon: InfoIcon,
      // bg alpha-suffixed (#0088ff @ 0x15) has no soft-info token — deferred to Pass 2 / plan 12 (RC-01).
      bg: '#0088ff15',
      border: 'var(--info)',
      color: 'var(--info)'
    }
  };

  const { icon: Icon, bg, border, color } = config[type] || config.info;

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '4px',
        padding: '12px 16px',
        minWidth: '300px',
        maxWidth: '400px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <Icon size={20} color={color} />
      <span style={{
        flex: 1,
        fontSize: '13px',
        color: 'var(--white)',
        fontWeight: '500'
      }}>
        {message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted-2)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <XIcon size={14} />
      </button>
    </div>
  );
};

export default ToastProvider;
