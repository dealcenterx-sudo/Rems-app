// Public lead intake endpoint for external sources (website forms, lead
// providers). Requires the shared secret in the x-api-key header.
// POST JSON: { name, email, phone, serviceType, source, street, city,
//              state, zipCode, propertyType, notes }
const { getDb, getAuthAdmin } = require('./_lib/firebaseAdmin');
const { ADMIN_EMAIL } = require('./_lib/config');
const { leadIntakeSchema, validateBody } = require('./_lib/validate');
const { withSentry } = require('./_lib/withSentry');

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const intakeKey = process.env.LEAD_INTAKE_KEY;
  if (!intakeKey) {
    return res.status(503).json({ error: 'Lead intake not configured' });
  }
  if (req.headers['x-api-key'] !== intakeKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  let db;
  let authAdmin;
  try {
    db = getDb();
    authAdmin = getAuthAdmin();
  } catch (error) {
    return res.status(503).json({ error: 'Lead intake not configured' });
  }

  const input = validateBody(req, res, leadIntakeSchema);
  if (!input) return;

  const {
    name, email, phone, serviceType, source,
    street, city, state, zipCode, propertyType, notes
  } = input;

  const now = new Date().toISOString();

  try {
    // Leads land in the admin's pipeline by default.
    const owner = await authAdmin.getUserByEmail(ADMIN_EMAIL).catch(() => null);

    const lead = {
      name: name || '',
      email: email || '',
      phone: phone || '',
      serviceType: serviceType || '',
      source: source || 'API intake',
      street: street || '',
      city: city || '',
      state: state || '',
      zipCode: zipCode || '',
      propertyType: propertyType || '',
      notes: notes || '',
      warmth: 'cold',
      userId: owner?.uid || null,
      submittedAt: now,
      createdAt: now,
      updatedAt: now
    };

    const ref = await db.collection('leads').add(lead);

    if (owner) {
      await db.collection('notifications').add({
        recipientId: owner.uid,
        actorId: owner.uid,
        actorEmail: 'lead-intake@rems',
        type: 'lead-intake',
        title: `New lead: ${name || email || phone}`,
        body: [serviceType, city && state ? `${city}, ${state}` : city || state, source]
          .filter(Boolean).join(' · '),
        dealId: null,
        read: false,
        createdAt: now
      });
    }

    return res.status(200).json({ ok: true, id: ref.id });
  } catch (error) {
    console.error('lead-intake error:', error);
    return res.status(500).json({ error: 'Failed to create lead' });
  }
};

module.exports = withSentry(handler);
