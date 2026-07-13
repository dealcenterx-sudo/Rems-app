import * as Sentry from '@sentry/react';
import { isSentryEnabled, captureError, captureWebVital } from './observability';

// Explicit factory mock — @sentry/react's export shape breaks jest auto-mock
// ("Failed to get mock metadata"), so stub only the surface we assert on
// (mirrors the factory-mock pattern in notifications.test.js).
jest.mock('@sentry/react', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  flush: jest.fn(() => Promise.resolve(true))
}));

// Dummy DSN — never a real one (threat T-03-02). Shape mirrors a Sentry DSN.
const DUMMY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

const ORIGINAL_DSN = process.env.REACT_APP_SENTRY_DSN;

beforeEach(() => {
  jest.clearAllMocks();
  // The default env state has NO DSN — this is the primary assertion path.
  delete process.env.REACT_APP_SENTRY_DSN;
});

afterEach(() => {
  // Restore the original env so no test leaks DSN state into another.
  if (ORIGINAL_DSN === undefined) {
    delete process.env.REACT_APP_SENTRY_DSN;
  } else {
    process.env.REACT_APP_SENTRY_DSN = ORIGINAL_DSN;
  }
});

describe('isSentryEnabled', () => {
  it('is false when REACT_APP_SENTRY_DSN is unset (default env state)', () => {
    expect(isSentryEnabled()).toBe(false);
  });

  it('is true when REACT_APP_SENTRY_DSN is set', () => {
    process.env.REACT_APP_SENTRY_DSN = DUMMY_DSN;
    expect(isSentryEnabled()).toBe(true);
  });
});

describe('initObservability (DSN gating)', () => {
  it('does NOT call Sentry.init when the DSN is unset (clean no-op)', () => {
    // Isolate so the module-level `initialized` flag starts fresh.
    jest.isolateModules(() => {
      const SentryFresh = require('@sentry/react');
      const { initObservability } = require('./observability');
      initObservability();
      expect(SentryFresh.init).not.toHaveBeenCalled();
    });
  });

  it('calls Sentry.init exactly once with the DSN when set, guarding double-init', () => {
    process.env.REACT_APP_SENTRY_DSN = DUMMY_DSN;
    jest.isolateModules(() => {
      const SentryFresh = require('@sentry/react');
      const { initObservability } = require('./observability');
      initObservability();
      // Second call must be a no-op via the module-level `initialized` guard.
      initObservability();
      expect(SentryFresh.init).toHaveBeenCalledTimes(1);
      expect(SentryFresh.init).toHaveBeenCalledWith(
        expect.objectContaining({ dsn: DUMMY_DSN })
      );
    });
  });
});

describe('captureError', () => {
  it('is a no-op (Sentry never touched) when the DSN is unset', () => {
    captureError(new Error('boom'), { some: 'context' });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('calls Sentry.captureException with the context under { extra } when enabled', () => {
    process.env.REACT_APP_SENTRY_DSN = DUMMY_DSN;
    const err = new Error('boom');
    captureError(err, { componentStack: '\n  at Boom' });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      extra: { componentStack: '\n  at Boom' }
    });
  });

  it('defaults context to an empty object under { extra } when omitted', () => {
    process.env.REACT_APP_SENTRY_DSN = DUMMY_DSN;
    const err = new Error('boom');
    captureError(err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err, { extra: {} });
  });
});

describe('captureWebVital', () => {
  const metric = {
    id: 'v3-1700000000000-1234567890123',
    name: 'LCP',
    value: 2400.5,
    delta: 100.25,
    rating: 'good'
  };

  it('is a no-op when the DSN is unset', () => {
    captureWebVital(metric);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('is a no-op when the metric is falsy even if the DSN is set', () => {
    process.env.REACT_APP_SENTRY_DSN = DUMMY_DSN;
    captureWebVital(undefined);
    captureWebVital(null);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('calls Sentry.captureMessage with the Web Vital title, level, tags and contexts when enabled', () => {
    process.env.REACT_APP_SENTRY_DSN = DUMMY_DSN;
    captureWebVital(metric);
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Web Vital: LCP', {
      level: 'info',
      tags: { web_vital: 'LCP', rating: 'good' },
      contexts: {
        web_vital: {
          id: metric.id,
          name: 'LCP',
          value: 2400.5,
          delta: 100.25
        }
      }
    });
  });

  it("falls back to rating 'unknown' when the metric has no rating", () => {
    process.env.REACT_APP_SENTRY_DSN = DUMMY_DSN;
    captureWebVital({ id: 'x', name: 'CLS', value: 0.01, delta: 0.01 });
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Web Vital: CLS',
      expect.objectContaining({
        level: 'info',
        tags: { web_vital: 'CLS', rating: 'unknown' }
      })
    );
  });
});
