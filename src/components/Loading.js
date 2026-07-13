import React from 'react';

export const LoadingSpinner = ({ size = 40, color = 'var(--accent)' }) => (
  <div
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      border: `3px solid ${color}20`,
      borderTop: `3px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }}
  />
);

export const LoadingOverlay = ({ message = 'Loading...' }) => (
  <div
    role="status"
    aria-live="polite"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px',
      gap: '20px'
    }}
  >
    <LoadingSpinner size={50} />
    <div style={{
      fontSize: '14px',
      color: 'var(--text-faint)',
      fontWeight: '500'
    }}>
      {message}
    </div>
  </div>
);

export const LoadingButton = ({ loading, pendingLabel, children, ...props }) => {
  const { style, ...restProps } = props;

  return (
    <button
      {...restProps}
      disabled={loading || props.disabled}
      style={{
        ...style,
        opacity: loading ? 0.6 : style?.opacity || 1,
        cursor: loading ? 'not-allowed' : style?.cursor || 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)'
      }}
    >
      {loading && <LoadingSpinner size={16} color={style?.color || 'var(--white)'} />}
      {loading ? (pendingLabel || 'Loading…') : children}
    </button>
  );
};
