// Temporary diagnostics: reports which integration env vars are visible
// to the runtime. Booleans, key names, and init errors only — never values.
const { getDb } = require('./_lib/firebaseAdmin');

module.exports = async (req, res) => {
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
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    firebaseAdminConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
    leadIntakeConfigured: Boolean(process.env.LEAD_INTAKE_KEY),
    adminInit,
    matchingKeyNames: keys
  });
};
