import * as Sentry from '@sentry/react';

let initialized = false;

const parseSampleRate = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
};

export const isSentryEnabled = () => Boolean(process.env.REACT_APP_SENTRY_DSN);

export const initObservability = () => {
  if (initialized || !isSentryEnabled()) return;

  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: parseSampleRate(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE)
  });
  initialized = true;
};

export const captureError = (error, context = {}) => {
  if (!isSentryEnabled()) return;
  Sentry.captureException(error, {
    extra: context
  });
};

export const captureWebVital = (metric) => {
  if (!isSentryEnabled() || !metric) return;

  Sentry.captureMessage(`Web Vital: ${metric.name}`, {
    level: 'info',
    tags: {
      web_vital: metric.name,
      rating: metric.rating || 'unknown'
    },
    contexts: {
      web_vital: {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta
      }
    }
  });
};
