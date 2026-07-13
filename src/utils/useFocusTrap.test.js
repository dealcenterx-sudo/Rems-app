import React, { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import useFocusTrap from './useFocusTrap';

// Harness that traps focus inside a container of three buttons, with an
// external "invoker" button outside the trap to verify focus restoration.
const Harness = ({ active }) => {
  const ref = useRef(null);
  useFocusTrap(ref, active);
  return (
    <div>
      <button data-testid="invoker">invoker</button>
      <div ref={ref}>
        <button>first</button>
        <button>middle</button>
        <button>last</button>
      </div>
    </div>
  );
};

describe('useFocusTrap', () => {
  it('focuses the first tabbable element on activate', () => {
    render(<Harness active />);
    expect(screen.getByText('first')).toHaveFocus();
  });

  it('wraps Tab from the last tabbable back to the first', () => {
    render(<Harness active />);
    const last = screen.getByText('last');
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(screen.getByText('first')).toHaveFocus();
  });

  it('wraps Shift+Tab from the first tabbable to the last', () => {
    render(<Harness active />);
    const first = screen.getByText('first');
    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(screen.getByText('last')).toHaveFocus();
  });

  it('restores focus to the invoker on deactivate', () => {
    const { rerender } = render(<Harness active={false} />);
    const invoker = screen.getByTestId('invoker');
    invoker.focus();
    expect(invoker).toHaveFocus();

    rerender(<Harness active />);
    expect(screen.getByText('first')).toHaveFocus();

    rerender(<Harness active={false} />);
    expect(invoker).toHaveFocus();
  });

  it('does not move focus while inactive', () => {
    render(<Harness active={false} />);
    // No element inside the trap is focused when inactive.
    expect(screen.getByText('first')).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });
});
