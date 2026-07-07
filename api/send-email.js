// Vercel serverless function: authenticated email sending via Resend.
// Requires RESEND_API_KEY (and optionally EMAIL_FROM) in Vercel env vars.

const { FIREBASE_API_KEY } = require('./_lib/config');
const { sendEmailSchema, validateBody } = require('./_lib/validate');
const { withSentry } = require('./_lib/withSentry');

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Email service not configured' });
  }

  // Only signed-in REMS users may send — verify the Firebase ID token.
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  let senderEmail = null;
  try {
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    if (!lookup.ok) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }
    const lookupData = await lookup.json();
    senderEmail = lookupData.users?.[0]?.email || null;
    if (!senderEmail) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Auth verification failed' });
  }

  const input = validateBody(req, res, sendEmailSchema);
  if (!input) return;

  const { to, subject, text, html, cc, bcc } = input;

  const payload = {
    from: process.env.EMAIL_FROM || 'REMS <onboarding@resend.dev>',
    to: [to],
    subject,
    reply_to: senderEmail,
    ...(text ? { text } : {}),
    ...(html ? { html } : {}),
    ...(cc ? { cc: [cc] } : {}),
    ...(bcc ? { bcc: [bcc] } : {})
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({ error: data?.message || 'Email provider rejected the send' });
    }
    return res.status(200).json({ ok: true, id: data.id });
  } catch (error) {
    return res.status(502).json({ error: 'Email provider unreachable' });
  }
};

module.exports = withSentry(handler);
