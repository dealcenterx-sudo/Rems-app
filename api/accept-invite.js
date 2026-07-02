// Consumes a deal-party invite token for the signed-in user: links their
// account to the party record, grants deal portal access, notifies the
// deal owner. The signed-in email must match the invited email.
const { getAdmin } = require('./_lib/firebaseAdmin');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let admin;
  try {
    admin = getAdmin();
  } catch (error) {
    return res.status(503).json({ error: 'Invite service not configured' });
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  const { inviteToken } = req.body || {};
  if (!inviteToken) {
    return res.status(400).json({ error: 'inviteToken is required' });
  }

  const db = admin.firestore();
  const now = new Date().toISOString();

  try {
    const snap = await db
      .collection('deal-parties')
      .where('inviteToken', '==', inviteToken)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ error: 'Invite not found or already used' });
    }

    const partyDoc = snap.docs[0];
    const party = partyDoc.data();

    const invitedEmail = (party.email || '').toLowerCase();
    const signedInEmail = (decoded.email || '').toLowerCase();
    if (!invitedEmail || invitedEmail !== signedInEmail) {
      return res.status(403).json({
        error: `This invite was sent to a different email address. Sign in with ${party.email || 'the invited address'} to accept it.`
      });
    }

    const dealId = party.dealId;

    // Consume the token and link everything.
    await partyDoc.ref.update({
      status: 'joined',
      joinedAt: now,
      userId: decoded.uid,
      inviteToken: null
    });
    await db.collection('users').doc(decoded.uid).set(
      { assignedDeals: admin.firestore.FieldValue.arrayUnion(dealId), updatedAt: now },
      { merge: true }
    );
    await db.collection('deals').doc(dealId).update({
      participantIds: admin.firestore.FieldValue.arrayUnion(decoded.uid),
      updatedAt: now
    });

    const dealSnap = await db.collection('deals').doc(dealId).get();
    const deal = dealSnap.exists ? dealSnap.data() : {};

    if (deal.userId && deal.userId !== decoded.uid) {
      await db.collection('notifications').add({
        recipientId: deal.userId,
        actorId: decoded.uid,
        actorEmail: decoded.email || '',
        type: 'party-joined',
        title: `${party.name || decoded.email} joined "${deal.propertyAddress || 'your deal'}"`,
        body: 'They accepted their invite and now have deal portal access.',
        dealId,
        read: false,
        createdAt: now
      });
    }

    return res.status(200).json({
      ok: true,
      dealId,
      propertyAddress: deal.propertyAddress || null
    });
  } catch (error) {
    console.error('accept-invite error:', error);
    return res.status(500).json({ error: 'Failed to accept invite' });
  }
};
