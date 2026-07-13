import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Traps Tab focus within containerRef while active; restores focus to the invoker on close. */
const useFocusTrap = (containerRef, active = true) => {
  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const invoker = document.activeElement;
    const getTabbables = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));

    const initial = getTabbables();
    if (initial.length > 0) initial[0].focus();

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const items = getTabbables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (invoker && typeof invoker.focus === 'function') invoker.focus();
    };
  }, [containerRef, active]);
};

export default useFocusTrap;
