// Temporary diagnostics: reports which integration env vars are visible
// to the runtime. Booleans and key names only — never values.
module.exports = async (req, res) => {
  const keys = Object.keys(process.env).filter((k) =>
    /RESEND|FIREBASE|LEAD|EMAIL/i.test(k)
  );
  return res.status(200).json({
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    firebaseAdminConfigured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
    leadIntakeConfigured: Boolean(process.env.LEAD_INTAKE_KEY),
    matchingKeyNames: keys
  });
};
