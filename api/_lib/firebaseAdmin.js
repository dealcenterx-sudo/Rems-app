// Shared Firebase Admin initialization for serverless functions.
// Requires FIREBASE_SERVICE_ACCOUNT (the service account JSON) in env.
const admin = require('firebase-admin');

let initialized = false;

const getAdmin = () => {
  if (!initialized) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
    }
    const credentials = JSON.parse(raw);
    // Env storage sometimes double-escapes the PEM newlines.
    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(credentials)
    });
    initialized = true;
  }
  return admin;
};

module.exports = { getAdmin };
