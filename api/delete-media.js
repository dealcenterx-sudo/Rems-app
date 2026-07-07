// Authenticated Cloudinary Admin API delete endpoint.
const cloudinary = require('cloudinary').v2;
const { FIREBASE_API_KEY, CLOUDINARY_CLOUD_NAME } = require('./_lib/config');
const { deleteMediaSchema, validateBody } = require('./_lib/validate');
const { withSentry } = require('./_lib/withSentry');

const verifyFirebaseUser = async (req) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return null;

  const lookup = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    }
  );
  if (!lookup.ok) return null;
  return (await lookup.json()).users?.[0] || null;
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyFirebaseUser(req).catch(() => null);
  if (!user?.localId) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  const input = validateBody(req, res, deleteMediaSchema);
  if (!input) return;

  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiKey || !apiSecret || !CLOUDINARY_CLOUD_NAME) {
    return res.status(503).json({ error: 'Media delete not configured' });
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: apiKey,
    api_secret: apiSecret
  });

  const result = await cloudinary.uploader.destroy(input.publicId, {
    resource_type: input.resourceType,
    invalidate: true
  });

  if (result.result === 'ok' || result.result === 'not found') {
    return res.status(200).json({ ok: true, result: result.result });
  }

  return res.status(502).json({ error: 'Media provider rejected the delete' });
};

module.exports = withSentry(handler);
