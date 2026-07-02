import { auth } from '../firebase';

/**
 * Send an email through the authenticated /api/send-email serverless
 * function (Resend). Returns { ok, id } or { ok: false, reason } —
 * callers decide their own fallback (webhook, mailto, or none).
 */
export const sendEmailViaApi = async ({ to, subject, text, html, cc, bcc }) => {
  const user = auth.currentUser;
  if (!user) return { ok: false, reason: 'not-signed-in' };

  try {
    const token = await user.getIdToken();
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ to, subject, text, html, cc, bcc })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, reason: data.error || `status-${response.status}` };
    }
    return { ok: true, id: data.id };
  } catch (error) {
    return { ok: false, reason: error.message || 'network-error' };
  }
};
