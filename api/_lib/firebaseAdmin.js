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
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(raw))
    });
    initialized = true;
  }
  return admin;
};

module.exports = { getAdmin };
