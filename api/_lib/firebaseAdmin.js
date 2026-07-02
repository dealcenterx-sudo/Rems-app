// Shared Firebase Admin initialization for serverless functions.
// Requires FIREBASE_SERVICE_ACCOUNT (the service account JSON) in env.
// firebase-admin v14 is fully modular — no legacy namespace API.
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const init = () => {
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
    }
    const credentials = JSON.parse(raw);
    // Env storage sometimes double-escapes the PEM newlines.
    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    initializeApp({ credential: cert(credentials) });
  }
};

const getDb = () => {
  init();
  return getFirestore();
};

const getAuthAdmin = () => {
  init();
  return getAuth();
};

module.exports = { getDb, getAuthAdmin, FieldValue };
