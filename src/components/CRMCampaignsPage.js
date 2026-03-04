import React, { useState } from 'react';

// ─── helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active:   { label: 'Active',   color: '#00ff88', bg: '#00ff8815' },
  paused:   { label: 'Paused',   color: '#ffaa00', bg: '#ffaa0015' },
  draft:    { label: 'Draft',    color: '#888888', bg: '#88888815' },
  complete: { label: 'Complete', color: '#aa00ff', bg: '#aa00ff15' },
};

const TYPES = ['Email', 'SMS', 'Cold Call', 'Direct Mail', 'Social'];

// ─── seed data ─────────────────────────────────────────────────────────────────
const SEED_CAMPAIGNS = [
  {
    id: 'c1', name: 'Miami Q1 Seller Outreach', type: 'Email', status: 'active',
    startDate: '2026-01-15', leads: 120, opened: 54, replied: 12,
    description: 'Targeting off-market sellers in Miami-Dade and Broward.'
  },
  {
    id: 'c2', name: 'Spring SMS Blast — Buyers', type: 'SMS', status: 'active',
    startDate: '2026-02-01', leads: 88, opened: 76, replied: 9,
    description: 'Re-engage warm buyer leads with new inventory alerts.'
  },
  {
    id: 'c3', name: 'Absentee Owner Mailer', type: 'Direct Mail', status: 'paused',
    startDate: '2025-11-10', leads: 350, opened: 0, replied: 22,
    description: 'Postcard campaign targeting absentee owners in Orlando.'
  },
  {
    id: 'c4', name: 'Cold Call Blitz — Probate', type: 'Cold Call', status: 'draft',
    startDate: '2026-03-10', leads: 0, opened: 0, replied: 0,
    description: 'Probate leads sourced from county records.'
  },
  {
    id: 'c5', name: 'Year-End Seller Push 2025', type: 'Email', status: 'complete',
    startDate: '2025-12-01', leads: 200, opened: 130, replied: 38,
    description: 'Closed out 2025 with a seller motivation campaign.'
  },
];

// ─── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`,
      borderRadius: '999px', padding: '3px 10px', fontSize: '12px', fontWeight: '600'
    }}>{cfg.label}</span>
  );
};

// ─── Create Campaign Modal ─────────────────────────────────────────────────────
const CreateModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    name: '', type: 'Email', status: 'draft', startDate: '', description: ''
  });
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = () => {
    if (!form.name.trim()) { setError('Campaign name is required.'); return; }
    onCreate({ ...form, id: `c${Date.now()}`, leads: 0, opened: 0, replied: 0 });
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '14px',
        width: '520px', maxWidth: '95vw', zIndex: 1101, padding: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>New Campaign</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={labelStyle}>Campaign Name *</div>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="e.g. Miami Q2 Seller Outreach" />
            {error && <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '4px' }}>{error}</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={labelStyle}>Type</div>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Status</div>
              <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={labelStyle}>Start Date</div>
            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Description</div>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What is this campaign targeting?" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={onClose} style={ghostBtnStyle}>Cancel</button>
          <button onClick={submit} style={primaryBtnStyle}>Create Campaign</button>
        </div>
      </div>
    </>
  );
};

// ─── Campaign Row ──────────────────────────────────────────────────────────────
const CampaignRow = ({ c, onStatusChange }) => {
  const openRate = c.leads > 0 ? Math.round((c.opened / c.leads) * 100) : 0;
  const replyRate = c.leads > 0 ? Math.round((c.replied / c.leads) * 100) : 0;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px 80px 80px 120px',
      alignItems: 'center', gap: '12px',
      padding: '14px 20px', borderBottom: '1px solid #1a1a1a',
      transition: 'background 0.15s', cursor: 'default'
    }}
      onMouseEnter={e => e.currentTarget.style.background = '#111'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '3px' }}>{c.name}</div>
        <div style={{ fontSize: '12px', color: '#555' }}>{c.description}</div>
      </div>
      <div style={{ fontSize: '12px', color: '#888' }}>{c.type}</div>
      <div><StatusBadge status={c.status} /></div>
      <div style={{ fontSize: '13px', color: '#ddd', textAlign: 'right' }}>{c.leads.toLocaleString()}</div>
      <div style={{ fontSize: '13px', color: '#00ff88', textAlign: 'right' }}>{openRate}%</div>
      <div style={{ fontSize: '13px', color: '#ffaa00', textAlign: 'right' }}>{replyRate}%</div>
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        {c.status === 'active' && (
          <button onClick={() => onStatusChange(c.id, 'paused')} style={{ ...pillBtnStyle, color: '#ffaa00', borderColor: '#ffaa0044' }}>Pause</button>
        )}
        {c.status === 'paused' && (
          <button onClick={() => onStatusChange(c.id, 'active')} style={{ ...pillBtnStyle, color: '#00ff88', borderColor: '#00ff8844' }}>Resume</button>
        )}
        {c.status === 'draft' && (
          <button onClick={() => onStatusChange(c.id, 'active')} style={{ ...pillBtnStyle, color: '#00ff88', borderColor: '#00ff8844' }}>Launch</button>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const CRMCampaignsPage = () => {
  const [campaigns, setCampaigns] = useState(SEED_CAMPAIGNS);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = (c) => setCampaigns(prev => [c, ...prev]);
  const handleStatusChange = (id, status) => setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));

  const filtered = campaigns.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Summary KPIs
  const active = campaigns.filter(c => c.status === 'active').length;
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalReplies = campaigns.reduce((s, c) => s + c.replied, 0);

  return (
    <div className="page-content">
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Active Campaigns', value: active, color: '#00ff88' },
          { label: 'Total Leads Touched', value: totalLeads.toLocaleString(), color: '#0088ff' },
          { label: 'Total Replies', value: totalReplies.toLocaleString(), color: '#ffaa00' },
        ].map(k => (
          <div key={k.label} className="card-surface" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{k.label}</div>
            <div style={{ fontSize: '30px', fontWeight: '700', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search campaigns…"
          style={{ ...inputStyle, flex: '1', minWidth: '180px' }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="all">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={() => setShowCreate(true)} style={primaryBtnStyle}>+ New Campaign</button>
      </div>

      {/* Table */}
      <div className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 80px 100px 80px 80px 80px 120px',
          gap: '12px', padding: '12px 20px',
          borderBottom: '1px solid #1e1e1e', background: '#111'
        }}>
          {['Campaign', 'Type', 'Status', 'Leads', 'Open%', 'Reply%', ''].map(h => (
            <div key={h} style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: h === '' || h === 'Leads' || h === 'Open%' || h === 'Reply%' ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#444' }}>No campaigns match these filters.</div>
        ) : (
          filtered.map(c => <CampaignRow key={c.id} c={c} onStatusChange={handleStatusChange} />)
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
};

// ─── styles ────────────────────────────────────────────────────────────────────
const inputStyle = {
  background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px',
  color: '#fff', fontSize: '13px', padding: '9px 12px', outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box', width: '100%'
};
const primaryBtnStyle = {
  background: '#00ff88', color: '#000', border: 'none', borderRadius: '8px',
  padding: '9px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap'
};
const ghostBtnStyle = {
  background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '8px',
  padding: '9px 16px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit'
};
const pillBtnStyle = {
  background: 'transparent', border: '1px solid', borderRadius: '999px',
  padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600'
};
const labelStyle = { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' };

export default CRMCampaignsPage;
