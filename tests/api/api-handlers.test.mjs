import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';

const requireFromRoot = createRequire(new URL('../../package.json', import.meta.url));
const cloudinaryPath = requireFromRoot.resolve('cloudinary');
const firebaseAdminPath = requireFromRoot.resolve('./api/_lib/firebaseAdmin.js');

const handlerPath = (name) => requireFromRoot.resolve(`./api/${name}.js`);

const clearApiModules = () => {
  [
    firebaseAdminPath,
    handlerPath('accept-invite'),
    handlerPath('csp-report'),
    handlerPath('delete-media'),
    handlerPath('lead-intake'),
    handlerPath('send-email')
  ].forEach((modulePath) => {
    delete requireFromRoot.cache[modulePath];
  });
};

const mockFirebaseAdmin = (exports) => {
  requireFromRoot.cache[firebaseAdminPath] = {
    id: firebaseAdminPath,
    filename: firebaseAdminPath,
    loaded: true,
    exports
  };
};

const mockCloudinary = (v2) => {
  requireFromRoot.cache[cloudinaryPath] = {
    id: cloudinaryPath,
    filename: cloudinaryPath,
    loaded: true,
    exports: { v2 }
  };
};

const loadHandler = (name) => {
  delete requireFromRoot.cache[handlerPath(name)];
  return requireFromRoot(`./api/${name}.js`);
};

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

const makeCollection = (handlers = {}) => ({
  add: vi.fn(handlers.add || (async () => ({ id: 'new-doc' }))),
  doc: vi.fn((id) => handlers.doc?.(id) || ({
    set: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
    get: vi.fn(async () => ({ exists: false, data: () => ({}) }))
  })),
  where: vi.fn(() => ({
    limit: vi.fn(() => ({
      get: vi.fn(handlers.get || (async () => ({ empty: true, docs: [] })))
    }))
  }))
});

beforeEach(() => {
  clearApiModules();
  vi.restoreAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.LEAD_INTAKE_KEY;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  delete process.env.SENTRY_DSN;
  delete process.env.REACT_APP_SENTRY_DSN;
});

afterEach(() => {
  clearApiModules();
  delete requireFromRoot.cache[cloudinaryPath];
  vi.unstubAllGlobals();
});

describe('api/send-email', () => {
  it('rejects requests without a Firebase auth token', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    const handler = loadHandler('send-email');

    const result = await invoke(handler, {
      body: { to: 'buyer@example.com', subject: 'Hello', text: 'Body' }
    });

    expect(result.status).toBe(401);
    expect(result.body.error).toBe('Missing auth token');
  });

  it('returns 400 when required email payload fields are missing after auth succeeds', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ users: [{ email: 'agent@example.com' }] })
    })));
    const handler = loadHandler('send-email');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer valid-token' },
      body: { to: 'buyer@example.com' }
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('Invalid request payload');
    expect(result.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'subject' }),
      expect.objectContaining({ path: 'text' })
    ]));
  });

  it('returns 502 when the email provider rejects the send', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [{ email: 'agent@example.com' }] })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Provider rejected payload' })
      }));
    const handler = loadHandler('send-email');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer valid-token' },
      body: { to: 'buyer@example.com', subject: 'Hello', text: 'Body' }
    });

    expect(result.status).toBe(502);
    expect(result.body.error).toBe('Provider rejected payload');
  });

  it('returns 200 with the provider message id on a successful send', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [{ email: 'agent@example.com' }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'email-1' })
      }));
    const handler = loadHandler('send-email');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer valid-token' },
      body: { to: 'buyer@example.com', subject: 'Hello', text: 'Body' }
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, id: 'email-1' });
  });

  it('rejects non-POST requests with 405', async () => {
    const handler = loadHandler('send-email');

    const result = await invoke(handler, { method: 'GET' });

    expect(result.status).toBe(405);
    expect(result.body.error).toBe('Method not allowed');
  });
});

describe('api/accept-invite', () => {
  it('returns 503 when Firebase Admin is not configured', async () => {
    mockFirebaseAdmin({
      getDb: vi.fn(() => { throw new Error('not configured'); }),
      getAuthAdmin: vi.fn()
    });
    const handler = loadHandler('accept-invite');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer token' },
      body: { inviteToken: 'invite-1' }
    });

    expect(result.status).toBe(503);
    expect(result.body.error).toBe('Invite service not configured');
  });

  it('rejects requests with an invalid Firebase auth token', async () => {
    mockFirebaseAdmin({
      getDb: vi.fn(() => ({ collection: vi.fn() })),
      getAuthAdmin: vi.fn(() => ({
        verifyIdToken: vi.fn(async () => { throw new Error('bad token'); })
      })),
      FieldValue: { arrayUnion: vi.fn((value) => ({ arrayUnion: value })) }
    });
    const handler = loadHandler('accept-invite');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer invalid' },
      body: { inviteToken: 'invite-1' }
    });

    expect(result.status).toBe(401);
    expect(result.body.error).toBe('Invalid auth token');
  });

  it('returns 400 when inviteToken is missing', async () => {
    mockFirebaseAdmin({
      getDb: vi.fn(() => ({ collection: vi.fn() })),
      getAuthAdmin: vi.fn(() => ({
        verifyIdToken: vi.fn(async () => ({ uid: 'user-1', email: 'buyer@example.com' }))
      })),
      FieldValue: { arrayUnion: vi.fn((value) => ({ arrayUnion: value })) }
    });
    const handler = loadHandler('accept-invite');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer valid' },
      body: {}
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('Invalid request payload');
    expect(result.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'inviteToken' })
    ]));
  });

  it('rejects invites for a different email address', async () => {
    const partyDoc = {
      data: () => ({ email: 'seller@example.com', dealId: 'deal-1' }),
      ref: { update: vi.fn() }
    };
    const db = {
      collection: vi.fn((name) => makeCollection({
        get: async () => (name === 'deal-parties'
          ? { empty: false, docs: [partyDoc] }
          : { empty: true, docs: [] })
      }))
    };
    mockFirebaseAdmin({
      getDb: vi.fn(() => db),
      getAuthAdmin: vi.fn(() => ({
        verifyIdToken: vi.fn(async () => ({ uid: 'user-1', email: 'buyer@example.com' }))
      })),
      FieldValue: { arrayUnion: vi.fn((value) => ({ arrayUnion: value })) }
    });
    const handler = loadHandler('accept-invite');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer valid' },
      body: { inviteToken: 'invite-1' }
    });

    expect(result.status).toBe(403);
    expect(result.body.error).toContain('different email address');
    expect(partyDoc.ref.update).not.toHaveBeenCalled();
  });

  it('returns 200 and links the deal for a matching invite', async () => {
    const partyDoc = {
      data: () => ({ email: 'buyer@example.com', dealId: 'deal-1', name: 'Buyer' }),
      ref: { update: vi.fn(async () => undefined) }
    };
    const dealDoc = {
      set: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
      get: vi.fn(async () => ({
        exists: true,
        data: () => ({ userId: 'owner-1', propertyAddress: '123 Main St' })
      }))
    };
    const db = {
      collection: vi.fn((name) => {
        if (name === 'deal-parties') return makeCollection({
          get: async () => ({ empty: false, docs: [partyDoc] })
        });
        if (name === 'deals') return makeCollection({ doc: () => dealDoc });
        return makeCollection();
      })
    };
    mockFirebaseAdmin({
      getDb: vi.fn(() => db),
      getAuthAdmin: vi.fn(() => ({
        verifyIdToken: vi.fn(async () => ({ uid: 'user-1', email: 'buyer@example.com' }))
      })),
      FieldValue: { arrayUnion: vi.fn((value) => ({ arrayUnion: value })) }
    });
    const handler = loadHandler('accept-invite');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer valid' },
      body: { inviteToken: 'invite-1' }
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      dealId: 'deal-1',
      propertyAddress: '123 Main St'
    });
    expect(partyDoc.ref.update).toHaveBeenCalled();
  });

  it('rejects requests with no authorization header', async () => {
    mockFirebaseAdmin({
      getDb: vi.fn(() => ({ collection: vi.fn() })),
      getAuthAdmin: vi.fn(() => ({
        verifyIdToken: vi.fn(async () => ({ uid: 'user-1', email: 'buyer@example.com' }))
      })),
      FieldValue: { arrayUnion: vi.fn((value) => ({ arrayUnion: value })) }
    });
    const handler = loadHandler('accept-invite');

    const result = await invoke(handler, {
      body: { inviteToken: 'invite-1' }
    });

    expect(result.status).toBe(401);
    expect(result.body.error).toBe('Missing auth token');
  });

  it('returns 404 when the invite token matches no deal party', async () => {
    const db = {
      collection: vi.fn(() => makeCollection({
        get: async () => ({ empty: true, docs: [] })
      }))
    };
    mockFirebaseAdmin({
      getDb: vi.fn(() => db),
      getAuthAdmin: vi.fn(() => ({
        verifyIdToken: vi.fn(async () => ({ uid: 'user-1', email: 'buyer@example.com' }))
      })),
      FieldValue: { arrayUnion: vi.fn((value) => ({ arrayUnion: value })) }
    });
    const handler = loadHandler('accept-invite');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer valid' },
      body: { inviteToken: 'missing' }
    });

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Invite not found or already used');
  });

  it('rejects non-POST requests with 405', async () => {
    mockFirebaseAdmin({
      getDb: vi.fn(() => ({ collection: vi.fn() })),
      getAuthAdmin: vi.fn(),
      FieldValue: { arrayUnion: vi.fn() }
    });
    const handler = loadHandler('accept-invite');

    const result = await invoke(handler, { method: 'GET' });

    expect(result.status).toBe(405);
    expect(result.body.error).toBe('Method not allowed');
  });
});

describe('api/lead-intake', () => {
  it('returns 503 when the intake key is not configured', async () => {
    const handler = loadHandler('lead-intake');

    const result = await invoke(handler, {
      headers: { 'x-api-key': 'incoming-key' },
      body: { email: 'lead@example.com' }
    });

    expect(result.status).toBe(503);
    expect(result.body.error).toBe('Lead intake not configured');
  });

  it('rejects requests with the wrong intake key', async () => {
    process.env.LEAD_INTAKE_KEY = 'correct-key';
    const handler = loadHandler('lead-intake');

    const result = await invoke(handler, {
      headers: { 'x-api-key': 'wrong-key' },
      body: { email: 'lead@example.com' }
    });

    expect(result.status).toBe(401);
    expect(result.body.error).toBe('Invalid API key');
  });

  it('returns 400 when no identifying lead fields are provided', async () => {
    process.env.LEAD_INTAKE_KEY = 'correct-key';
    mockFirebaseAdmin({
      getDb: vi.fn(() => ({ collection: vi.fn() })),
      getAuthAdmin: vi.fn(() => ({ getUserByEmail: vi.fn() }))
    });
    const handler = loadHandler('lead-intake');

    const result = await invoke(handler, {
      headers: { 'x-api-key': 'correct-key' },
      body: { source: 'Website' }
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('Invalid request payload');
    expect(result.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'name' })
    ]));
  });

  it('creates the lead and notification for a valid intake request', async () => {
    process.env.LEAD_INTAKE_KEY = 'correct-key';
    const addLead = vi.fn(async () => ({ id: 'lead-1' }));
    const addNotification = vi.fn(async () => ({ id: 'notification-1' }));
    const db = {
      collection: vi.fn((name) => {
        if (name === 'leads') return makeCollection({ add: addLead });
        if (name === 'notifications') return makeCollection({ add: addNotification });
        return makeCollection();
      })
    };
    mockFirebaseAdmin({
      getDb: vi.fn(() => db),
      getAuthAdmin: vi.fn(() => ({
        getUserByEmail: vi.fn(async () => ({ uid: 'admin-uid' }))
      }))
    });
    const handler = loadHandler('lead-intake');

    const result = await invoke(handler, {
      headers: { 'x-api-key': 'correct-key' },
      body: { name: 'Lead Name', email: 'lead@example.com', source: 'Website' }
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, id: 'lead-1' });
    expect(addLead).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Lead Name',
      email: 'lead@example.com',
      userId: 'admin-uid'
    }));
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: 'admin-uid',
      type: 'lead-intake'
    }));
  });

  it('rejects non-POST requests with 405', async () => {
    const handler = loadHandler('lead-intake');

    const result = await invoke(handler, { method: 'GET' });

    expect(result.status).toBe(405);
    expect(result.body.error).toBe('Method not allowed');
  });
});

describe('api/delete-media', () => {
  it('rejects requests without a Firebase auth token', async () => {
    const handler = loadHandler('delete-media');

    const result = await invoke(handler, {
      body: { publicId: 'properties/image-1', resourceType: 'image' }
    });

    expect(result.status).toBe(401);
    expect(result.body.error).toBe('Invalid auth token');
  });

  it('returns 400 for malformed delete payloads after auth succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ users: [{ localId: 'user-1', email: 'agent@example.com' }] })
    })));
    const handler = loadHandler('delete-media');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer valid-token' },
      body: { resourceType: 'image' }
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toBe('Invalid request payload');
    expect(result.body.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'publicId' })
    ]));
  });

  it('returns 503 when Cloudinary Admin credentials are missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ users: [{ localId: 'user-1', email: 'agent@example.com' }] })
    })));
    const handler = loadHandler('delete-media');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer valid-token' },
      body: { publicId: 'properties/image-1', resourceType: 'image' }
    });

    expect(result.status).toBe(503);
    expect(result.body.error).toBe('Media delete not configured');
  });

  it('deletes media with Cloudinary when credentials are configured', async () => {
    process.env.CLOUDINARY_API_KEY = 'cloudinary-key';
    process.env.CLOUDINARY_API_SECRET = 'cloudinary-secret';
    const destroy = vi.fn(async () => ({ result: 'ok' }));
    const config = vi.fn();
    mockCloudinary({
      config,
      uploader: { destroy }
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ users: [{ localId: 'user-1', email: 'agent@example.com' }] })
    })));
    const handler = loadHandler('delete-media');

    const result = await invoke(handler, {
      headers: { authorization: 'Bearer valid-token' },
      body: { publicId: 'properties/image-1', resourceType: 'image' }
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, result: 'ok' });
    expect(config).toHaveBeenCalledWith(expect.objectContaining({
      cloud_name: 'dcirl3j3v',
      api_key: 'cloudinary-key',
      api_secret: 'cloudinary-secret'
    }));
    expect(destroy).toHaveBeenCalledWith('properties/image-1', {
      resource_type: 'image',
      invalidate: true
    });
  });
});

describe('api/csp-report', () => {
  it('accepts CSP report-only violation reports without authentication', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const handler = loadHandler('csp-report');

    const result = await invoke(handler, {
      body: {
        'csp-report': {
          'blocked-uri': 'https://example.com/script.js',
          'violated-directive': 'script-src',
          'document-uri': 'https://rems-app.vercel.app/'
        }
      }
    });

    expect(result.status).toBe(204);
    expect(warn).toHaveBeenCalledWith('CSP Report-Only violation', expect.objectContaining({
      blockedUri: 'https://example.com/script.js',
      violatedDirective: 'script-src'
    }));
  });
});
