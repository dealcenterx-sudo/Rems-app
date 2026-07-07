// Diagnostics endpoint. Public callers get a bare status; admin callers with a
// valid Firebase ID token get integration config presence and init status.
const { getDb } = require('./_lib/firebaseAdmin');
const { ADMIN_EMAIL, FIREBASE_API_KEY } = require('./_lib/config');
const { withSentry } = require('./_lib/withSentry');

const handler = async (req, res) => {
  const bare = { status: 'ok' };

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return res.status(200).json(bare);
  }

  let user = null;
  try {
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      }
    );
    if (lookup.ok) {
      user = (await lookup.json()).users?.[0] || null;
    }
  } catch {
    return res.status(200).json(bare);
  }

  if (!user || user.email !== ADMIN_EMAIL || !user.emailVerified) {
    return res.status(200).json(bare);
  }

  const keys = Object.keys(process.env).filter((k) =>
    /RESEND|FIREBASE|LEAD|EMAIL/i.test(k)
  );

  let adminInit = 'ok';
  try {
    getDb();
  } catch (error) {
    adminInit = error.message || 'failed';
  }

  return res.status(200).json({
    status: 'ok',
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    firebaseAdminConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
    leadIntakeConfigured: Boolean(process.env.LEAD_INTAKE_KEY),
    adminInit,
    matchingKeyNames: keys
  });
};

module.exports = withSentry(handler);
