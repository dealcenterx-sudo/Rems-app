import { mapError, toToastString } from './errorMessages';

// Pure util — keep the Firebase SDK out of the unit test (mirrors permissions.test.js).
const SENTINEL = 'RAW_SDK_LEAK_a1b2c3d4_stacktrace_line_42';

describe('mapError', () => {
  it('maps a known auth code to a non-empty message + recovery', () => {
    const out = mapError({ code: 'auth/invalid-credential' });
    expect(out.message).toBeTruthy();
    expect(out.recovery).toBeTruthy();
    expect(typeof out.message).toBe('string');
    expect(typeof out.recovery).toBe('string');
  });

  it('maps the migrated auth codes to curated copy', () => {
    ['auth/email-already-in-use', 'auth/weak-password', 'auth/invalid-email',
      'auth/too-many-requests', 'auth/popup-closed-by-user', 'auth/network-request-failed']
      .forEach((code) => {
        const out = mapError({ code });
        expect(out.message).toBeTruthy();
        expect(out.recovery).toBeTruthy();
      });
  });

  it('maps the Firestore/API codes the live flows surface', () => {
    ['permission-denied', 'unavailable', 'not-found', 'deadline-exceeded'].forEach((code) => {
      const out = mapError({ code });
      expect(out.message).toBeTruthy();
      expect(out.recovery).toBeTruthy();
    });
  });

  it('returns the safe generic for an unknown code and NEVER echoes the raw SDK message', () => {
    const out = mapError({ code: 'auth/some-brand-new-code', message: SENTINEL });
    // safe generic fields present
    expect(out.message).toBeTruthy();
    expect(out.recovery).toBeTruthy();
    // no leak of raw SDK detail anywhere in the returned object
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain(SENTINEL);
    expect(out.message).not.toContain(SENTINEL);
    expect(out.recovery).not.toContain(SENTINEL);
    // no raw code leaked either
    expect(serialized).not.toContain('auth/some-brand-new-code');
  });

  it('returns the safe generic for undefined/null/malformed input without leaking', () => {
    expect(mapError(undefined).message).toBeTruthy();
    expect(mapError(null).recovery).toBeTruthy();
    const out = mapError({ message: SENTINEL }); // no code at all
    expect(JSON.stringify(out)).not.toContain(SENTINEL);
  });
});

describe('toToastString', () => {
  it('composes message and recovery into one non-empty string', () => {
    const str = toToastString({ code: 'auth/invalid-credential' });
    expect(typeof str).toBe('string');
    expect(str.length).toBeGreaterThan(0);
  });

  it('never leaks the raw SDK message in the composed toast string', () => {
    const str = toToastString({ code: 'unknown-xyz', message: SENTINEL });
    expect(str).not.toContain(SENTINEL);
  });
});
