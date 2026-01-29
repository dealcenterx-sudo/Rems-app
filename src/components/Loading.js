import React from 'react';

export const LoadingSpinner = ({ size = 40, color = '#0088ff' }) => (
  <div
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
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px',
    gap: '20px'
  }}>
    <LoadingSpinner size={50} />
    <div style={{
      fontSize: '14px',
      color: '#666666',
      fontWeight: '500'
    }}>
      {message}
    </div>
  </div>
);

export const LoadingButton = ({ loading, children, ...props }) => {
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
        gap: '8px'
      }}
    >
      {loading && <LoadingSpinner size={16} color={style?.color || '#ffffff'} />}
      {loading ? 'Loading...' : children}
    </button>
  );
};
