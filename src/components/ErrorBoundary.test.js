import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { captureError } from '../utils/observability';

// Mock the observability bridge so the test asserts on captureError without
// pulling @sentry/react into the component test at all.
jest.mock('../utils/observability', () => ({
  captureError: jest.fn()
}));

// A child that throws during render to trip componentDidCatch.
const Boom = () => {
  throw new Error('Boom exploded');
};

describe('ErrorBoundary', () => {
  it('bridges a caught render error to captureError with a componentStack and shows the fallback UI', () => {
    // React logs caught render errors to console.error — suppress the noise.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(captureError).toHaveBeenCalledTimes(1);
    const [thrownError, context] = captureError.mock.calls[0];
    expect(thrownError).toBeInstanceOf(Error);
    expect(thrownError.message).toBe('Boom exploded');
    expect(context).toEqual(
      expect.objectContaining({ componentStack: expect.any(String) })
    );

    // Recovery fallback UI renders.
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it('renders children normally and never calls captureError when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>All good here</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('All good here')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    expect(captureError).not.toHaveBeenCalled();
  });
});
