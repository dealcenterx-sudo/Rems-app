import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, query, orderBy
} from 'firebase/firestore';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (iso) => {
  if (!iso) return '—';
  try {
    const d = iso.toDate ? iso.toDate() : new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return '—'; }
};

const fmtTime = (iso) => {
  if (!iso) return '';
  try {
    const d = iso.toDate ? iso.toDate() : new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
};

const warmthColor = (w = '') => {
  const map = { hot: 'var(--danger-alt)', warm: 'var(--warning)', cold: 'var(--info)', closed: '#aa00ff', dead: 'var(--gray-555)' };
  return map[(w || '').toLowerCase()] || 'var(--text-muted-2)';
};

const WARMTH_OPTIONS = ['Cold', 'Warm', 'Hot', 'Closed', 'Dead'];

const sampleLead = {
  id: 'sample-lead-1',
  submittedAt: '2026-02-20T14:30:00.000Z',
  name: 'Sunrise Property Group LLC',
  phone: '(305) 555-0189',
  email: 'acquisitions@sunrisepg.com',
  serviceType: 'Buying a property',
  street: '1280 Biscayne Blvd',
  city: 'Miami',
  state: 'FL',
  zipCode: '33132',
  warmth: 'Cold',
  source: 'Zillow',
  notes: 'Interested in multi-family properties in Miami-Dade. Budget around $2M.',
  isSample: true
};

// ─── Activity Icon ─────────────────────────────────────────────────────────────
const ActivityIcon = ({ type }) => {
  const icons = {
    note: '📝', call: '📞', email: '✉️', text: '💬', meeting: '🤝',
    status: '🔄', system: '⚙️', contact: '👤', default: '📌'
  };
  return <span style={{ fontSize: '14px' }}>{icons[type] || icons.default}</span>;
};

// ─── Tab Button ────────────────────────────────────────────────────────────────
const Tab = ({ id, label, active, onClick, badge }) => (
  <button
    onClick={() => onClick(id)}
    style={{
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '10px 16px', fontSize: '13px', fontWeight: active ? '600' : '400',
      color: active ? 'var(--accent)' : 'var(--text-muted-2)',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      transition: 'all 0.15s', position: 'relative', whiteSpace: 'nowrap',
      fontFamily: 'inherit'
    }}
  >
    {label}
    {badge > 0 && (
      <span style={{
        marginLeft: '6px', background: 'var(--accent)', color: 'var(--surface-0)', borderRadius: '999px',
        fontSize: '11px', fontWeight: '700', padding: '1px 6px'
      }}>{badge}</span>
    )}
  </button>
);

// ─── Field Row ─────────────────────────────────────────────────────────────────
const FieldRow = ({ label, value, onSave, type = 'text', options }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const editRef = useRef(null);

  useEffect(() => { setDraft(value || ''); }, [value]);

  // Managed focus: focus the revealed control when entering edit mode
  // (replaces autoFocus for a11y — jsx-a11y/no-autofocus).
  useEffect(() => { if (editing) editRef.current?.focus(); }, [editing]);

  const commit = () => {
    if (draft !== value) onSave(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        {options ? (
          <select
            ref={editRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            style={inputStyle}
          >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            ref={editRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            style={inputStyle}
          />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setEditing(true);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${label}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px',
        cursor: 'text', padding: '6px 8px', borderRadius: '6px',
        transition: 'background 0.15s'
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--skeleton-highlight)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      onFocus={e => { e.currentTarget.style.background = 'var(--skeleton-highlight)'; }}
      onBlur={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ fontSize: '11px', color: 'var(--text-muted-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: value ? 'var(--white)' : 'var(--gray-555)' }}>{value || 'Click to edit…'}</div>
    </div>
  );
};

const inputStyle = {
  background: 'var(--skeleton-highlight)', border: '1px solid var(--accent)', borderRadius: '6px',
  color: 'var(--white)', fontSize: '14px', padding: '8px 10px', outline: 'none',
  width: '100%', fontFamily: 'inherit', boxSizing: 'border-box'
};

// ─── Details Tab ───────────────────────────────────────────────────────────────
const DetailsTab = ({ lead, onFieldSave }) => (
  <div style={{ padding: '20px' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
      <FieldRow label="Name" value={lead.name || lead.fullName || lead.entityName} onSave={v => onFieldSave('name', v)} />
      <FieldRow label="Phone" value={lead.phone} onSave={v => onFieldSave('phone', v)} type="tel" />
      <FieldRow label="Email" value={lead.email} onSave={v => onFieldSave('email', v)} type="email" />
      <FieldRow label="Lead Source" value={lead.source || lead.leadSource} onSave={v => onFieldSave('source', v)} />
      <FieldRow label="Service" value={lead.serviceType || lead.service} onSave={v => onFieldSave('serviceType', v)} />
      <FieldRow label="Warmth" value={lead.warmth} onSave={v => onFieldSave('warmth', v)} options={WARMTH_OPTIONS} />
    </div>
    <div style={{ borderTop: '1px solid var(--skeleton-highlight)', paddingTop: '16px', marginTop: '4px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted-2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Address</div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0 16px' }}>
        <FieldRow label="Street" value={lead.street || lead.address?.street} onSave={v => onFieldSave('street', v)} />
        <FieldRow label="City" value={lead.city || lead.address?.city} onSave={v => onFieldSave('city', v)} />
        <FieldRow label="State" value={lead.state || lead.address?.state} onSave={v => onFieldSave('state', v)} />
      </div>
      <FieldRow label="ZIP" value={lead.zipCode || lead.zip} onSave={v => onFieldSave('zipCode', v)} />
    </div>
    <div style={{ borderTop: '1px solid var(--skeleton-highlight)', paddingTop: '16px', marginTop: '4px' }}>
      <div style={{ fontSize: '11px', color: 'var(--text-muted-2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Submitted</div>
      <div style={{ fontSize: '13px', color: '#aaa' }}>{fmt(lead.submittedAt || lead.createdAt)}</div>
    </div>
  </div>
);

// ─── Activity Tab ──────────────────────────────────────────────────────────────
const ActivityTab = ({ lead, activities, onAddActivity }) => {
  const [composing, setComposing] = useState(false);
  const [type, setType] = useState('note');
  const [body, setBody] = useState('');

  const submit = async () => {
    if (!body.trim()) return;
    await onAddActivity({ type, body: body.trim() });
    setBody(''); setComposing(false);
  };

  // Build timeline from activities + system events
  const systemEvents = [];
  if (lead.submittedAt || lead.createdAt) {
    systemEvents.push({ id: 'sys-submitted', type: 'system', body: 'Lead submitted', ts: lead.submittedAt || lead.createdAt });
  }
  if (lead.warmth) {
    systemEvents.push({ id: 'sys-warmth', type: 'status', body: `Warmth set to ${lead.warmth}`, ts: lead.updatedAt || lead.submittedAt || lead.createdAt });
  }
  const all = [...systemEvents, ...(activities || [])].sort((a, b) => {
    const ta = a.ts?.toDate ? a.ts.toDate() : new Date(a.ts || 0);
    const tb = b.ts?.toDate ? b.ts.toDate() : new Date(b.ts || 0);
    return tb - ta;
  });

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted-2)' }}>{all.length} event{all.length !== 1 ? 's' : ''}</div>
        <button onClick={() => setComposing(true)} style={actionBtnStyle}>+ Log Activity</button>
      </div>

      {composing && (
        <div style={{ background: 'var(--gray-111)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {['note', 'call', 'email', 'text', 'meeting'].map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                ...pillStyle, background: type === t ? '#00ff8820' : 'transparent',
                color: type === t ? 'var(--accent)' : 'var(--text-muted-2)', border: `1px solid ${type === t ? 'var(--accent)' : 'var(--gray-333)'}`
              }}>{t}</button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="What happened?"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', width: '100%', marginBottom: '10px' }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setComposing(false); setBody(''); }} style={ghostBtnStyle}>Cancel</button>
            <button onClick={submit} style={actionBtnStyle}>Save</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {all.length === 0 && <div style={{ color: 'var(--gray-444)', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>No activity yet</div>}
        {all.map(ev => (
          <div key={ev.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--skeleton-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
              <ActivityIcon type={ev.type} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: '#ddd', lineHeight: '1.4' }}>{ev.body || ev.title || ev.summary}</div>
              <div style={{ fontSize: '11px', color: 'var(--gray-555)', marginTop: '3px' }}>{fmtTime(ev.ts || ev.sentAt || ev.createdAt)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Notes Tab ─────────────────────────────────────────────────────────────────
const NotesTab = ({ lead, onSaveNotes }) => {
  const [notes, setNotes] = useState(lead.notes || '');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setNotes(lead.notes || ''); setDirty(false); }, [lead.id, lead.notes]);

  const save = async () => {
    setSaving(true);
    await onSaveNotes(notes);
    setDirty(false);
    setSaving(false);
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <textarea
        value={notes}
        onChange={e => { setNotes(e.target.value); setDirty(true); }}
        placeholder="Add notes about this lead…"
        style={{
          ...inputStyle, resize: 'none', flex: 1, minHeight: '300px',
          lineHeight: '1.6', border: '1px solid var(--border-strong)'
        }}
      />
      {dirty && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button onClick={save} disabled={saving} style={actionBtnStyle}>
            {saving ? 'Saving…' : 'Save Notes'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Email Tab ─────────────────────────────────────────────────────────────────
const EmailTab = ({ lead }) => {
  const [to, setTo] = useState(lead.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);

  const send = () => {
    if (!to || !subject || !body) return;
    // In production, call email API. For now, open mailto as demo.
    window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <div style={fieldLabelStyle}>To</div>
        <input value={to} onChange={e => setTo(e.target.value)} style={inputStyle} placeholder="recipient@email.com" />
      </div>
      <div>
        <div style={fieldLabelStyle}>Subject</div>
        <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} placeholder="Subject line" />
      </div>
      <div>
        <div style={fieldLabelStyle}>Message</div>
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="Compose your message…" style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={send} style={{ ...actionBtnStyle, opacity: (!to || !subject || !body) ? 0.5 : 1 }}>
          {sent ? 'Sent ✓' : 'Send Email'}
        </button>
      </div>
    </div>
  );
};

// ─── Shared styles ─────────────────────────────────────────────────────────────
const actionBtnStyle = {
  background: 'var(--accent)', color: 'var(--surface-0)', border: 'none', borderRadius: '6px',
  padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit'
};
const ghostBtnStyle = {
  background: 'transparent', color: 'var(--text-muted-2)', border: '1px solid var(--gray-333)', borderRadius: '6px',
  padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit'
};
const pillStyle = {
  borderRadius: '999px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit'
};
const fieldLabelStyle = { fontSize: '11px', color: 'var(--text-muted-2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' };

// ─── Main Drawer ───────────────────────────────────────────────────────────────
const LeadDrawer = ({ leadId, onClose, onOpenFullDetail }) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('details');
  const [activities, setActivities] = useState([]);
  const [saving, setSaving] = useState(false);

  const isSample = leadId === 'sample-lead-1';

  const loadLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    if (isSample) {
      setLead({ ...sampleLead });
      setActivities([]);
      setLoading(false);
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'leads', leadId));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setLead(data);
        // Load activity log from sub-collection if it exists
        try {
          const actSnap = await getDocs(
            query(collection(db, 'leads', leadId, 'activityLog'), orderBy('ts', 'desc'))
          );
          const acts = [];
          actSnap.forEach(d => acts.push({ id: d.id, ...d.data() }));
          setActivities(acts);
        } catch {
          setActivities(Array.isArray(data.activityLog) ? data.activityLog : []);
        }
      }
    } catch (err) {
      console.error('LeadDrawer load error:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId, isSample]);

  useEffect(() => { loadLead(); }, [loadLead]);

  const handleFieldSave = async (field, value) => {
    if (!lead) return;
    const update = { [field]: value };
    setLead(prev => ({ ...prev, ...update }));
    if (isSample) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, 'leads', leadId), update);
    } catch (err) {
      console.error('Field save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async (notes) => {
    if (!lead) return;
    setLead(prev => ({ ...prev, notes }));
    if (isSample) return;
    await updateDoc(doc(db, 'leads', leadId), { notes });
  };

  const handleAddActivity = async ({ type, body }) => {
    const ts = new Date().toISOString();
    const entry = { id: `act-${Date.now()}`, type, body, ts, source: 'user' };
    setActivities(prev => [entry, ...prev]);
    if (isSample) return;
    try {
      await addDoc(collection(db, 'leads', leadId, 'activityLog'), { type, body, ts, source: 'user' });
    } catch {
      // fallback: store in lead doc
      const updated = [entry, ...(lead.activityLog || [])];
      await updateDoc(doc(db, 'leads', leadId), { activityLog: updated });
    }
  };

  if (!leadId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1000, backdropFilter: 'blur(2px)'
        }}
      />

      {/* Drawer Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '680px', maxWidth: '95vw',
        background: '#0d0d0d', borderLeft: '1px solid #1e1e1e',
        zIndex: 1001, display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
        animation: 'slideInRight 0.2s ease-out'
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 0', borderBottom: '1px solid var(--skeleton-highlight)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {loading ? (
                <div style={{ height: '24px', width: '200px', background: 'var(--skeleton-highlight)', borderRadius: '4px' }} />
              ) : lead ? (
                <>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--white)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lead.name || lead.fullName || lead.entityName || 'Unnamed Lead'}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      background: `${warmthColor(lead.warmth)}22`,
                      color: warmthColor(lead.warmth),
                      border: `1px solid ${warmthColor(lead.warmth)}44`,
                      borderRadius: '999px', padding: '2px 10px', fontSize: '12px', fontWeight: '600'
                    }}>{lead.warmth || 'Cold'}</span>
                    <span style={{ fontSize: '12px', color: 'var(--gray-555)' }}>{lead.serviceType || lead.service || '—'}</span>
                    <span style={{ fontSize: '12px', color: 'var(--gray-555)' }}>{lead.source || lead.leadSource || ''}</span>
                    {saving && <span style={{ fontSize: '11px', color: 'var(--accent)' }}>Saving…</span>}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--gray-555)' }}>Lead not found</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, marginLeft: '16px' }}>
              {lead && onOpenFullDetail && (
                <button
                  onClick={() => onOpenFullDetail(leadId)}
                  title="Open full detail page"
                  style={{ ...ghostBtnStyle, padding: '6px 12px', fontSize: '12px' }}
                >
                  Full Detail ↗
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-faint)', fontSize: '20px', lineHeight: 1, padding: '4px'
                }}
              >✕</button>
            </div>
          </div>

          {/* Tab Bar */}
          <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
            <Tab id="details" label="Details" active={tab === 'details'} onClick={setTab} />
            <Tab id="activity" label="Activity" active={tab === 'activity'} onClick={setTab} badge={activities.length} />
            <Tab id="notes" label="Notes" active={tab === 'notes'} onClick={setTab} />
            <Tab id="email" label="Email" active={tab === 'email'} onClick={setTab} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-555)' }}>Loading…</div>
          ) : lead ? (
            <>
              {tab === 'details' && <DetailsTab lead={lead} onFieldSave={handleFieldSave} />}
              {tab === 'activity' && <ActivityTab lead={lead} activities={activities} onAddActivity={handleAddActivity} />}
              {tab === 'notes' && <NotesTab lead={lead} onSaveNotes={handleSaveNotes} />}
              {tab === 'email' && <EmailTab lead={lead} />}
            </>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-555)' }}>Lead not found</div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default LeadDrawer;
