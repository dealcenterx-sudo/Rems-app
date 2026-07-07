// Sentry wrapper for Vercel serverless handlers. No-ops unless SENTRY_DSN
// or REACT_APP_SENTRY_DSN is configured in the runtime environment.
const Sentry = require('@sentry/node');

let initialized = false;

const parseSampleRate = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
};

const initSentry = () => {
  const dsn = process.env.SENTRY_DSN || process.env.REACT_APP_SENTRY_DSN;
  if (initialized || !dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE)
  });
  initialized = true;
  return true;
};

const withSentry = (handler) => async (req, res) => {
  const enabled = initSentry();

  try {
    return await handler(req, res);
  } catch (error) {
    if (enabled) {
      Sentry.captureException(error, {
        tags: {
          api_route: req.url || req.query?.path || 'unknown'
        },
        extra: {
          method: req.method
        }
      });
      await Sentry.flush(2000);
    }

    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    throw error;
  }
};

module.exports = { initSentry, withSentry };
