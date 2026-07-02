import { useEffect } from 'react';

/** Calls onEscape when the Escape key is pressed while active. */
const useEscapeKey = (onEscape, active = true) => {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (event) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, active]);
};

export default useEscapeKey;
