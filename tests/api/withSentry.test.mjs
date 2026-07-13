import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';

const requireFromRoot = createRequire(new URL('../../package.json', import.meta.url));
const sentryNodePath = requireFromRoot.resolve('@sentry/node');
const withSentryPath = requireFromRoot.resolve('./api/_lib/withSentry.js');

// Mirror mockFirebaseAdmin / mockCloudinary from api-handlers.test.mjs — inject a
// mock @sentry/node into the require cache using the same cache-object shape.
const mockSentryNode = (exports) => {
  requireFromRoot.cache[sentryNodePath] = {
    id: sentryNodePath,
    filename: sentryNodePath,
    loaded: true,
    exports
  };
};

// Fresh mock every load: { init, captureException, captureMessage, flush }.
let sentry;
const makeSentryMock = (order) => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  // flush pushes to the shared order-tracking array so we can prove
  // flush-before-respond ordering in the uncaught-throw case.
  flush: vi.fn(async () => {
    if (order) order.push('flush');
    return true;
  })
});

// Delete the wrapper from the cache before each require so the fresh @sentry/node
// mock is picked up AND the module-level `initialized` flag is reset between cases
// (parallels loadHandler in api-handlers.test.mjs).
const loadWithSentry = () => {
  delete requireFromRoot.cache[withSentryPath];
  return requireFromRoot('./api/_lib/withSentry.js');
};

// Reuse the invoke helper verbatim (node-mocks-http createMocks).
const invoke = async (handler, options = {}) => {
  const { req, res } = createMocks({
    method: 'POST',
    headers: {},
    body: {},
    ...options
  });
  await handler(req, res);
  return {
    status: res._getStatusCode(),
    body: res._isJSON() ? res._getJSONData() : res._getData()
  };
};

beforeEach(() => {
  delete process.env.SENTRY_DSN;
  delete process.env.REACT_APP_SENTRY_DSN;
  sentry = makeSentryMock();
  mockSentryNode(sentry);
});

afterEach(() => {
  delete requireFromRoot.cache[withSentryPath];
  delete requireFromRoot.cache[sentryNodePath];
  delete process.env.SENTRY_DSN;
  delete process.env.REACT_APP_SENTRY_DSN;
  vi.restoreAllMocks();
});

describe('api/_lib/withSentry', () => {
  it('no DSN: is a pass-through that returns the handler response and never touches Sentry', async () => {
    const { withSentry } = loadWithSentry();
    const handler = vi.fn(async (req, res) => res.status(200).json({ ok: true }));

    const result = await invoke(withSentry(handler));

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.flush).not.toHaveBeenCalled();
  });

  it('no DSN + throwing handler: still responds 500 but Sentry is never invoked', async () => {
    const { withSentry } = loadWithSentry();
    const wrapped = withSentry(async () => {
      throw new Error('boom');
    });

    const result = await invoke(wrapped);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: 'Internal server error' });
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.flush).not.toHaveBeenCalled();
  });

  it('DSN set + uncaught throw: captures the error, flushes(2000) BEFORE responding 500', async () => {
    process.env.SENTRY_DSN = 'https://public@o0.ingest.sentry.io/0';
    const order = [];
    sentry = makeSentryMock(order);
    mockSentryNode(sentry);

    const { withSentry } = loadWithSentry();
    const boom = new Error('boom');
    const wrapped = withSentry(async () => {
      throw boom;
    });

    // Drive the wrapper with mocks we control so we can spy on res.status and
    // record its position relative to flush in the shared order array.
    const { req, res } = createMocks({ method: 'POST', headers: {}, body: {} });
    const statusSpy = vi.spyOn(res, 'status').mockImplementation((code) => {
      order.push('respond');
      res.statusCode = code;
      return res;
    });

    await wrapped(req, res);

    expect(sentry.init).toHaveBeenCalledTimes(1);
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    expect(sentry.captureException).toHaveBeenCalledWith(boom, expect.objectContaining({
      tags: expect.objectContaining({ api_route: expect.any(String) }),
      extra: expect.objectContaining({ method: 'POST' })
    }));
    expect(sentry.flush).toHaveBeenCalledWith(2000);
    expect(statusSpy).toHaveBeenCalledWith(500);

    // flush-before-respond: flush must be recorded before the 500 status is set.
    expect(order).toEqual(['flush', 'respond']);
    expect(order.indexOf('flush')).toBeLessThan(order.indexOf('respond'));
  });

  it('DSN set + passing handler: returns the handler result and does NOT capture', async () => {
    process.env.SENTRY_DSN = 'https://public@o0.ingest.sentry.io/0';
    sentry = makeSentryMock();
    mockSentryNode(sentry);

    const { withSentry } = loadWithSentry();
    const handler = vi.fn(async (req, res) => res.status(200).json({ ok: true }));

    const result = await invoke(withSentry(handler));

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
    expect(sentry.init).toHaveBeenCalledTimes(1);
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.flush).not.toHaveBeenCalled();
  });
});
