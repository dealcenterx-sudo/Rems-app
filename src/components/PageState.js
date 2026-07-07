import React from 'react';

const PageState = ({
  tone = 'empty',
  icon: Icon,
  eyebrow,
  title,
  message,
  actions = null,
  children = null
}) => {
  const toneClass = ['error', 'warning', 'success'].includes(tone) ? tone : 'empty';

  return (
    <section className={`page-state page-state-${toneClass}`} aria-live={toneClass === 'error' ? 'assertive' : 'polite'}>
      {Icon && (
        <div className="page-state-icon" aria-hidden="true">
          <Icon size={30} />
        </div>
      )}
      {eyebrow && <div className="page-state-eyebrow">{eyebrow}</div>}
      <h2 className="page-state-title">{title}</h2>
      {message && <p className="page-state-message">{message}</p>}
      {children}
      {actions && <div className="page-state-actions">{actions}</div>}
    </section>
  );
};

export default PageState;
