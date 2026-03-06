import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from './Toast';
import { Plus, Users } from './Icons';

const PARTY_ROLES = [
  { value: 'buyers-agent', label: "Buyer's Agent", color: '#0088ff' },
  { value: 'sellers-agent', label: "Seller's Agent", color: '#00ff88' },
  { value: 'buyer', label: 'Buyer', color: '#0088ff' },
  { value: 'seller', label: 'Seller', color: '#00ff88' },
  { value: 'attorney', label: 'Attorney', color: '#ff8800' },
  { value: 'lender', label: 'Lender / Mortgage Broker', color: '#aa00ff' },
  { value: 'title-company', label: 'Title Company', color: '#ff0088' },
  { value: 'inspector', label: 'Inspector', color: '#888888' },
  { value: 'appraiser', label: 'Appraiser', color: '#888888' }
];

const DealPartiesTab = ({ dealId, deal }) => {
  const toast = useToast();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', role: 'buyers-agent', company: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadParties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const loadParties = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'deal-parties'), where('dealId', '==', dealId)));
      const data = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
      setParties(data);
    } catch (err) {
      console.error('Error loading parties:', err);
    }
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) {
      toast.error('Name and email are required');
      return;
    }
    setSending(true);
    try {
      const inviteToken = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      await addDoc(collection(db, 'deal-parties'), {
        dealId,
        name: inviteForm.name,
        email: inviteForm.email.toLowerCase().trim(),
        phone: inviteForm.phone,
        role: inviteForm.role,
        company: inviteForm.company,
        status: 'invited',
        inviteToken,
        invitedBy: auth.currentUser?.uid || null,
        invitedAt: new Date().toISOString(),
        joinedAt: null,
        userId: null
      });

      toast.success(`Invite sent to ${inviteForm.name}`);
      setInviteForm({ name: '', email: '', phone: '', role: 'buyers-agent', company: '' });
      setShowInviteModal(false);
      loadParties();
    } catch (err) {
      console.error('Error inviting party:', err);
      toast.error('Failed to send invite');
    }
    setSending(false);
  };

  const removeParty = async (partyId) => {
    try {
      await deleteDoc(doc(db, 'deal-parties', partyId));
      toast.success('Party removed');
      loadParties();
    } catch (err) {
      toast.error('Failed to remove party');
    }
  };

  const resendInvite = async (party) => {
    try {
      await updateDoc(doc(db, 'deal-parties', party.id), {
        invitedAt: new Date().toISOString()
      });
      toast.success(`Invite resent to ${party.name}`);
    } catch (err) {
      toast.error('Failed to resend invite');
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner" /></div>;
  }

  const groupedParties = PARTY_ROLES.reduce((acc, role) => {
    const members = parties.filter((p) => p.role === role.value);
    if (members.length > 0) acc.push({ ...role, members });
    return acc;
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>Deal Parties</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{parties.length} participant{parties.length !== 1 ? 's' : ''} in this deal</div>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
        >
          <Plus size={16} color="#000" /> Invite Party
        </button>
      </div>

      {/* Party Groups */}
      {parties.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon"><Users size={48} color="#333" /></div>
          <div className="empty-state-title">No parties added yet</div>
          <div className="empty-state-subtitle">Invite agents, attorneys, lenders, and title companies to collaborate on this deal</div>
          <button onClick={() => setShowInviteModal(true)} className="btn-primary" style={{ marginTop: '16px' }}>
            Invite First Party
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupedParties.map((group) => (
            <div key={group.value} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: group.color }} />
                <span style={{ fontSize: '13px', fontWeight: '600', color: group.color }}>{group.label}</span>
                <span style={{ fontSize: '11px', color: '#666' }}>({group.members.length})</span>
              </div>
              {group.members.map((party) => (
                <div key={party.id} style={{ padding: '14px 16px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Avatar */}
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: `${group.color}20`, color: group.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '700', flexShrink: 0
                  }}>
                    {party.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{party.name}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                      {party.email}
                      {party.company ? ` • ${party.company}` : ''}
                    </div>
                  </div>
                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
                      padding: '3px 10px', borderRadius: '10px',
                      color: party.status === 'joined' ? '#00ff88' : '#ffaa00',
                      background: party.status === 'joined' ? '#00ff8815' : '#ffaa0015'
                    }}>
                      {party.status === 'joined' ? 'Active' : 'Invited'}
                    </span>
                    {party.status === 'invited' && (
                      <button
                        onClick={() => resendInvite(party)}
                        style={{ background: 'none', border: '1px solid #333', color: '#888', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        Resend
                      </button>
                    )}
                    <button
                      onClick={() => removeParty(party.id)}
                      style={{ background: 'none', border: '1px solid #331111', color: '#ff4444', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', padding: '30px' }}>
            <div className="modal-header" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', color: '#fff', fontWeight: '600' }}>Invite Party to Deal</h2>
              <button onClick={() => setShowInviteModal(false)} className="icon-button">×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Role */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="form-input"
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                >
                  {PARTY_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name *</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="John Smith"
                  className="form-input"
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address *</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="john@example.com"
                  className="form-input"
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</label>
                <input
                  type="tel"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="form-input"
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                />
              </div>

              {/* Company */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company / Firm</label>
                <input
                  type="text"
                  value={inviteForm.company}
                  onChange={(e) => setInviteForm({ ...inviteForm, company: e.target.value })}
                  placeholder="ABC Realty, Smith Law Firm, etc."
                  className="form-input"
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #1a1a1a' }}>
              <button
                onClick={handleInvite}
                disabled={sending}
                className="btn-primary btn-block"
              >
                {sending ? 'Sending...' : 'Send Invite'}
              </button>
              <button onClick={() => setShowInviteModal(false)} className="btn-secondary btn-block">Cancel</button>
            </div>

            <div style={{ marginTop: '16px', padding: '12px', background: '#0a0a0a', borderRadius: '6px', border: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.5' }}>
                An email invitation will be sent with a link to join this deal portal. Once they create credentials, they'll have access to view deal details, chat, and documents based on their role.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealPartiesTab;
