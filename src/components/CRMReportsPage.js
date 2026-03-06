import React, { useState, useMemo } from 'react';

// ─── seed data ─────────────────────────────────────────────────────────────────
const SEED = [
  { id: '1', date: '2026-01-05', name: 'Apex Holdings LLC',     source: 'Zillow',    serviceType: 'Buying a property',  status: 'Closed',  warmth: 'Hot',  city: 'Miami',   state: 'FL' },
  { id: '2', date: '2026-01-12', name: 'Rivera Family Trust',   source: 'Website',   serviceType: 'Selling a property', status: 'Active',  warmth: 'Warm', city: 'Orlando', state: 'FL' },
  { id: '3', date: '2026-01-20', name: 'BlueStar Investments',  source: 'Referral',  serviceType: 'Buying a property',  status: 'Dead',    warmth: 'Cold', city: 'Tampa',   state: 'FL' },
  { id: '4', date: '2026-02-03', name: 'Sunrise Property Group',source: 'Zillow',    serviceType: 'Buying a property',  status: 'Active',  warmth: 'Hot',  city: 'Miami',   state: 'FL' },
  { id: '5', date: '2026-02-10', name: 'Morales & Sons Realty', source: 'Cold Call', serviceType: 'Selling a property', status: 'Active',  warmth: 'Warm', city: 'Miami',   state: 'FL' },
  { id: '6', date: '2026-02-18', name: 'Kessler Properties',    source: 'Website',   serviceType: 'Buying a property',  status: 'Closed',  warmth: 'Hot',  city: 'Orlando', state: 'FL' },
  { id: '7', date: '2026-02-25', name: 'New Horizon Capital',   source: 'Referral',  serviceType: 'Buying a property',  status: 'Active',  warmth: 'Warm', city: 'Tampa',   state: 'FL' },
  { id: '8', date: '2026-03-01', name: 'Torres Commercial LLC', source: 'Zillow',    serviceType: 'Selling a property', status: 'Active',  warmth: 'Cold', city: 'Miami',   state: 'FL' },
  { id: '9', date: '2026-03-03', name: 'Greenleaf Holdings',    source: 'Website',   serviceType: 'Buying a property',  status: 'Closed',  warmth: 'Hot',  city: 'Miami',   state: 'FL' },
];

const SOURCES = ['All Sources', 'Zillow', 'Website', 'Referral', 'Cold Call'];
const SERVICES = ['All Services', 'Buying a property', 'Selling a property'];
const STATUSES = ['All Statuses', 'Active', 'Closed', 'Dead'];
const WARMTHS = ['All', 'Hot', 'Warm', 'Cold'];

const warmthColor = (w = '') => {
  const map = { hot: '#ff4444', warm: '#ffaa00', cold: '#0088ff', closed: '#aa00ff', dead: '#555' };
  return map[w.toLowerCase()] || '#888';
};

// ─── CSV export ────────────────────────────────────────────────────────────────
const exportCSV = (rows) => {
  const headers = ['Date', 'Name', 'Source', 'Service', 'Status', 'Warmth', 'City', 'State'];
  const lines = [
    headers.join(','),
    ...rows.map(r => [r.date, `"${r.name}"`, r.source, `"${r.serviceType}"`, r.status, r.warmth, r.city, r.state].join(','))
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crm-leads-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Mini Bar Chart ────────────────────────────────────────────────────────────
const MiniBar = ({ label, value, max, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
    <div style={{ width: '90px', fontSize: '12px', color: '#aaa', flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1, height: '8px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color, borderRadius: '4px', transition: 'width 0.4s' }} />
    </div>
    <div style={{ width: '30px', fontSize: '12px', color: '#fff', textAlign: 'right' }}>{value}</div>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
const CRMReportsPage = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [warmthFilter, setWarmthFilter] = useState('All');

  const filtered = useMemo(() => {
    return SEED.filter(r => {
      if (fromDate && r.date < fromDate) return false;
      if (toDate && r.date > toDate) return false;
      if (sourceFilter !== 'All Sources' && r.source !== sourceFilter) return false;
      if (serviceFilter !== 'All Services' && r.serviceType !== serviceFilter) return false;
      if (statusFilter !== 'All Statuses' && r.status !== statusFilter) return false;
      if (warmthFilter !== 'All' && r.warmth !== warmthFilter) return false;
      return true;
    });
  }, [fromDate, toDate, sourceFilter, serviceFilter, statusFilter, warmthFilter]);

  // Summary metrics
  const closed = filtered.filter(r => r.status === 'Closed').length;
  const convRate = filtered.length > 0 ? Math.round((closed / filtered.length) * 100) : 0;

  // Source breakdown
  const bySource = SOURCES.slice(1).map(s => ({ label: s, value: filtered.filter(r => r.source === s).length }));
  const maxSource = Math.max(...bySource.map(b => b.value), 1);

  // By city
  const cities = [...new Set(filtered.map(r => r.city))];
  const byCity = cities.map(c => ({ label: c, value: filtered.filter(r => r.city === c).length })).sort((a, b) => b.value - a.value).slice(0, 5);
  const maxCity = Math.max(...byCity.map(b => b.value), 1);

  const clearFilters = () => {
    setFromDate(''); setToDate(''); setSourceFilter('All Sources');
    setServiceFilter('All Services'); setStatusFilter('All Statuses'); setWarmthFilter('All');
  };

  return (
    <div className="page-content">
      {/* Filter Panel */}
      <div className="card-surface" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>Filters</div>
          <button onClick={clearFilters} style={ghostBtnStyle}>Clear All</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          <div>
            <div style={labelStyle}>From</div>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>To</div>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Source</div>
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={inputStyle}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Service</div>
            <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} style={inputStyle}>
              {SERVICES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Status</div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={labelStyle}>Warmth</div>
            <select value={warmthFilter} onChange={e => setWarmthFilter(e.target.value)} style={inputStyle}>
              {WARMTHS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Leads', value: filtered.length, color: '#00ff88' },
          { label: 'Closed', value: closed, color: '#aa00ff' },
          { label: 'Conversion Rate', value: `${convRate}%`, color: '#ffaa00' },
          { label: 'Active', value: filtered.filter(r => r.status === 'Active').length, color: '#0088ff' },
        ].map(k => (
          <div key={k.label} className="card-surface" style={{ padding: '18px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{k.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts + Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="card-surface" style={{ padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>Leads by Source</div>
          {bySource.map(b => <MiniBar key={b.label} label={b.label} value={b.value} max={maxSource} color="#00ff88" />)}
        </div>
        <div className="card-surface" style={{ padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>Top Cities</div>
          {byCity.length === 0
            ? <div style={{ color: '#444', fontSize: '13px' }}>No data</div>
            : byCity.map(b => <MiniBar key={b.label} label={b.label} value={b.value} max={maxCity} color="#0088ff" />)
          }
        </div>
      </div>

      {/* Lead Table */}
      <div className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>Lead Results ({filtered.length})</div>
          <button onClick={() => exportCSV(filtered)} style={primaryBtnStyle}>⬇ Export CSV</button>
        </div>

        {/* Table Head */}
        <div style={{
          display: 'grid', gridTemplateColumns: '100px 2fr 100px 160px 80px 70px 80px',
          gap: '12px', padding: '10px 20px', background: '#111', borderBottom: '1px solid #1e1e1e'
        }}>
          {['Date', 'Name', 'Source', 'Service', 'Status', 'Warmth', 'City'].map(h => (
            <div key={h} style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#444' }}>No leads match these filters.</div>
        ) : (
          filtered.map(r => (
            <div key={r.id}
              style={{
                display: 'grid', gridTemplateColumns: '100px 2fr 100px 160px 80px 70px 80px',
                gap: '12px', padding: '12px 20px', borderBottom: '1px solid #111',
                alignItems: 'center', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#111'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: '12px', color: '#666' }}>{r.date}</div>
              <div style={{ fontSize: '13px', color: '#fff', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
              <div style={{ fontSize: '12px', color: '#888' }}>{r.source}</div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>{r.serviceType}</div>
              <div style={{ fontSize: '12px', color: r.status === 'Closed' ? '#aa00ff' : r.status === 'Active' ? '#00ff88' : '#555' }}>{r.status}</div>
              <div>
                <span style={{
                  background: `${warmthColor(r.warmth)}22`, color: warmthColor(r.warmth),
                  borderRadius: '999px', padding: '2px 8px', fontSize: '11px', fontWeight: '600'
                }}>{r.warmth}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>{r.city}</div>
            </div>
          ))
        )}
      </div>
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
  padding: '8px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit'
};
const ghostBtnStyle = {
  background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '8px',
  padding: '7px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit'
};
const labelStyle = { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' };

export default CRMReportsPage;
