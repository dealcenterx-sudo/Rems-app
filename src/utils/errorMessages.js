/**
 * Central error map (COPY-02, D-05).
 *
 * Single source of truth translating Firebase/API error codes into user-facing copy.
 * Generalizes the former `friendlyAuthError` in LoginPage.js into `code → { message, recovery }`.
 *
 * SECURITY (T-07-01, Information Disclosure): the fallback for unknown codes MUST return a
 * curated safe generic. It MUST NEVER echo the raw SDK `err.message`, error code, or stack —
 * those read like debug traces and can leak internal detail. Every consumer gets curated copy.
 *
 * Copy contract (per docs/COPY-STANDARD.md):
 *   message  = one plain sentence naming the problem (no codes, no stack, no security detail)
 *   recovery = one imperative next step
 */

/**
 * Curated `code → { message, recovery }` map.
 * Covers the auth codes the login flow surfaces plus the Firestore/API codes the live
 * data flows actually raise. Unknown codes are handled by the safe generic fallback.
 * @type {Object<string, { message: string, recovery: string }>}
 */
export const ERROR_MESSAGES = {
  // --- Firebase Auth (migrated + generalized from friendlyAuthError) ---
  'auth/invalid-credential': {
    message: 'Incorrect email or password.',
    recovery: 'Check your details and try again.'
  },
  'auth/wrong-password': {
    message: 'Incorrect email or password.',
    recovery: 'Check your details and try again.'
  },
  'auth/user-not-found': {
    message: 'Incorrect email or password.',
    recovery: 'Check your details and try again.'
  },
  'auth/email-already-in-use': {
    message: 'That email is already in use.',
    recovery: 'Sign in instead, or use a different email.'
  },
  'auth/weak-password': {
    message: 'That password is too short.',
    recovery: 'Use at least 6 characters.'
  },
  'auth/invalid-email': {
    message: 'That email address is not valid.',
    recovery: 'Check the address and try again.'
  },
  'auth/too-many-requests': {
    message: 'Too many attempts.',
    recovery: 'Wait a moment, then try again.'
  },
  'auth/popup-closed-by-user': {
    message: 'Google sign-in was cancelled.',
    recovery: 'Try signing in again.'
  },
  'auth/network-request-failed': {
    message: 'Network error.',
    recovery: 'Check your connection and try again.'
  },

  // --- Firestore / API codes the live flows surface ---
  'permission-denied': {
    message: 'You do not have access to this.',
    recovery: 'Contact an admin if you think this is a mistake.'
  },
  unavailable: {
    message: 'The service is temporarily unavailable.',
    recovery: 'Wait a moment, then try again.'
  },
  'not-found': {
    message: 'That item no longer exists.',
    recovery: 'Refresh the page and try again.'
  },
  'deadline-exceeded': {
    message: 'The request timed out.',
    recovery: 'Check your connection and try again.'
  }
};

/**
 * Safe generic returned for any unknown/undefined/malformed error.
 * Deliberately free of SDK detail — this is the leak-proof fallback (T-07-01).
 * @type {{ message: string, recovery: string }}
 */
export const GENERIC_ERROR = {
  message: 'Something went wrong.',
  recovery: 'Please try again.'
};

/**
 * Translate an error into curated user-facing copy.
 * Never returns raw SDK message/code/stack — unknown codes get GENERIC_ERROR.
 *
 * @param {{ code?: string, message?: string }|null|undefined} err - Firebase/API error (or null)
 * @returns {{ message: string, recovery: string }} curated copy safe to render
 * @example
 *   mapError({ code: 'auth/email-already-in-use' });
 *   // → { message: 'That email is already in use.', recovery: 'Sign in instead, or use a different email.' }
 */
export const mapError = (err) => {
  const code = err && typeof err.code === 'string' ? err.code : '';
  return ERROR_MESSAGES[code] || GENERIC_ERROR;
};

/**
 * Compose an error into a single string for Toast call sites: "{message} {recovery}".
 * Uses mapError, so it inherits the leak-proof guarantee.
 *
 * @param {{ code?: string, message?: string }|null|undefined} err
 * @returns {string} one display string, e.g. "That email is already in use. Sign in instead, or use a different email."
 */
export const toToastString = (err) => {
  const { message, recovery } = mapError(err);
  return recovery ? `${message} ${recovery}` : message;
};
