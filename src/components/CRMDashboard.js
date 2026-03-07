import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { isAdminUser } from '../utils/helpers';

// ─── helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return '';
  try {
    const d = iso.toDate ? iso.toDate() : new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
};

// ─── Mini Bar Chart ────────────────────────────────────────────────────────────
const BarChart = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="card-surface hover-lift">
      <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '20px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '160px' }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: item.color || '#00ff88' }}>{item.value}</div>
            <div style={{
              width: '100%',
              height: `${(item.value / maxValue) * 120}px`,
              background: `linear-gradient(180deg, ${item.color || '#00ff88'}, ${item.color || '#00ff88'}55)`,
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.5s ease',
              minHeight: '4px'
            }} />
            <div style={{ fontSize: '10px', color: '#666', textAlign: 'center', wordBreak: 'break-word', lineHeight: '1.3' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Donut Chart ───────────────────────────────────────────────────────────────
const DonutChart = ({ data, title }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  let cumulative = 0;
  const segments = data.map(d => {
    const pct = total > 0 ? (d.value / total) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start };
  });

  return (
    <div className="card-surface hover-lift">
      <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '20px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            {segments.map((seg, i) => {
              if (seg.pct === 0) return null;
              const r = 45;
              const cx = 60, cy = 60;
              const startAngle = (seg.start / 100) * 360 - 90;
              const endAngle = ((seg.start + seg.pct) / 100) * 360 - 90;
              const toRad = a => (a * Math.PI) / 180;
              const x1 = cx + r * Math.cos(toRad(startAngle));
              const y1 = cy + r * Math.sin(toRad(startAngle));
              const x2 = cx + r * Math.cos(toRad(endAngle));
              const y2 = cy + r * Math.sin(toRad(endAngle));
              const large = seg.pct > 50 ? 1 : 0;
              return (
                <path key={i}
                  d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                  fill={seg.color}
                  opacity="0.85"
                />
              );
            })}
            <circle cx="60" cy="60" r="28" fill="#0a0a0a" />
            <text x="60" y="56" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">{total}</text>
            <text x="60" y="70" textAnchor="middle" fill="#666" fontSize="9">Total</text>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          {data.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: '#ddd', fontWeight: '500' }}>{item.label}</div>
                <div style={{ fontSize: '11px', color: '#555' }}>{item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── KPI Card ──────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, icon, color, delta, sub }) => (
  <div className="card-surface hover-lift" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{icon}</div>
    </div>
    <div style={{ fontSize: '34px', fontWeight: '700', color: '#fff', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: '12px', color: '#555' }}>{sub}</div>}
    {delta !== undefined && (
      <div style={{ fontSize: '12px', color: delta >= 0 ? '#00ff88' : '#ff4444', fontWeight: '600' }}>
        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs last month
      </div>
    )}
  </div>
);

// ─── Activity Feed ─────────────────────────────────────────────────────────────
const ActivityFeed = ({ events }) => (
  <div className="card-surface" style={{ height: '100%' }}>
    <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '20px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Activity</h3>
    {events.length === 0 ? (
      <div style={{ color: '#444', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>No recent activity</div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {events.map((ev, i) => (
          <div key={i} style={{
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            padding: '12px 0', borderBottom: i < events.length - 1 ? '1px solid #111' : 'none'
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: `${ev.color || '#00ff88'}18`,
              border: `1px solid ${ev.color || '#00ff88'}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', flexShrink: 0
            }}>{ev.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: '#ddd', lineHeight: '1.4', marginBottom: '2px' }}>{ev.message}</div>
              {ev.sub && <div style={{ fontSize: '12px', color: '#555' }}>{ev.sub}</div>}
            </div>
            <div style={{ fontSize: '11px', color: '#444', flexShrink: 0 }}>{ev.time}</div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const CRMDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContacts: 0, totalDeals: 0, totalSellers: 0, totalBuyers: 0,
    totalLeads: 0, hotLeads: 0, closedDeals: 0,
    dealsByStatus: [], buyersByType: [], conversionRate: 0,
    recentLeads: []
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const isAdmin = isAdminUser();
      const uid = auth.currentUser?.uid;
      const baseFilter = isAdmin ? [] : [where('userId', '==', uid)];

      const leadsQuery = isAdmin
        ? query(collection(db, 'leads'), orderBy('submittedAt', 'desc'), limit(50))
        : query(collection(db, 'leads'), where('userId', '==', uid), orderBy('submittedAt', 'desc'), limit(50));

      const [
        totalContactsSnap,
        totalSellersSnap,
        totalBuyersSnap,
        flipperBuyersSnap,
        builderBuyersSnap,
        holderBuyersSnap,
        totalDealsSnap,
        newDealsSnap,
        activeDealsSnap,
        pendingDealsSnap,
        closedDealsSnap,
        hotLeadsSnap,
        totalLeadsSnap,
        recentLeadsSnap
      ] = await Promise.all([
        getCountFromServer(query(collection(db, 'contacts'), ...baseFilter)),
        getCountFromServer(query(collection(db, 'contacts'), ...baseFilter, where('contactType', '==', 'seller'))),
        getCountFromServer(query(collection(db, 'contacts'), ...baseFilter, where('contactType', '==', 'buyer'))),
        getCountFromServer(query(collection(db, 'contacts'), ...baseFilter, where('contactType', '==', 'buyer'), where('buyerType', '==', 'flipper'))),
        getCountFromServer(query(collection(db, 'contacts'), ...baseFilter, where('contactType', '==', 'buyer'), where('buyerType', '==', 'builder'))),
        getCountFromServer(query(collection(db, 'contacts'), ...baseFilter, where('contactType', '==', 'buyer'), where('buyerType', '==', 'holder'))),
        getCountFromServer(query(collection(db, 'deals'), ...baseFilter)),
        getCountFromServer(query(collection(db, 'deals'), ...baseFilter, where('status', '==', 'new'))),
        getCountFromServer(query(collection(db, 'deals'), ...baseFilter, where('status', '==', 'active'))),
        getCountFromServer(query(collection(db, 'deals'), ...baseFilter, where('status', '==', 'pending'))),
        getCountFromServer(query(collection(db, 'deals'), ...baseFilter, where('status', '==', 'closed'))),
        getCountFromServer(query(collection(db, 'leads'), ...baseFilter, where('warmth', '==', 'hot'))),
        getCountFromServer(query(collection(db, 'leads'), ...baseFilter)),
        getDocs(leadsQuery)
      ]);

      const totalContacts = totalContactsSnap.data().count;
      const totalSellers = totalSellersSnap.data().count;
      const totalBuyers = totalBuyersSnap.data().count;
      const flippers = flipperBuyersSnap.data().count;
      const builders = builderBuyersSnap.data().count;
      const holders = holderBuyersSnap.data().count;
      const totalDeals = totalDealsSnap.data().count;
      const newDeals = newDealsSnap.data().count;
      const activeDeals = activeDealsSnap.data().count;
      const pendingDeals = pendingDealsSnap.data().count;
      const closedDeals = closedDealsSnap.data().count;
      const hotLeads = hotLeadsSnap.data().count;
      const totalLeads = totalLeadsSnap.data().count;
      const leads = recentLeadsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const dealsByStatus = [
        { label: 'New', value: newDeals, color: '#ffaa00' },
        { label: 'Active', value: activeDeals, color: '#00ff88' },
        { label: 'Pending', value: pendingDeals, color: '#0088ff' },
        { label: 'Closed', value: closedDeals, color: '#aa00ff' }
      ];
      const buyersByType = [
        { label: 'Flippers', value: flippers, color: '#ff6600' },
        { label: 'Builders', value: builders, color: '#0088ff' },
        { label: 'Holders', value: holders, color: '#aa00ff' }
      ];

      // Recent activity from leads
      const recentLeads = leads.slice(0, 8).map((l) => ({
        icon: (l.warmth || '').toLowerCase() === 'hot' ? '🔥' : '📋',
        color: (l.warmth || '').toLowerCase() === 'hot' ? '#ff4444' : '#00ff88',
        message: `New lead: ${l.name || l.fullName || l.entityName || 'Unknown'}`,
        sub: l.serviceType || l.service || '',
        time: fmtTime(l.submittedAt || l.createdAt)
      }));

      const conversionRate = totalSellers > 0 ? ((totalDeals / totalSellers) * 100).toFixed(1) : 0;

      setStats({
        totalContacts,
        totalDeals,
        totalSellers,
        totalBuyers,
        totalLeads,
        hotLeads,
        closedDeals,
        dealsByStatus,
        buyersByType,
        conversionRate: parseFloat(conversionRate),
        recentLeads
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container"><div className="loading-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KPICard label="Total Leads" value={stats.totalLeads} icon="📥" color="#00ff88" sub="All time" />
        <KPICard label="Hot Leads" value={stats.hotLeads} icon="🔥" color="#ff4444" sub="Need action now" />
        <KPICard label="Open Deals" value={stats.totalDeals - stats.closedDeals} icon="💼" color="#0088ff" sub="In pipeline" />
        <KPICard label="Closed Deals" value={stats.closedDeals} icon="✅" color="#aa00ff" sub="All time" />
        <KPICard label="Conversion" value={`${stats.conversionRate}%`} icon="📈" color="#ffaa00" sub="Sellers → Deals" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <BarChart data={stats.dealsByStatus} title="Deal Pipeline" />
        <DonutChart data={stats.buyersByType} title="Buyer Distribution" />
      </div>

      {/* Bottom row: contact summary + activity feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        <div className="card-surface">
          <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '20px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact Mix</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { label: 'Sellers', value: stats.totalSellers, color: '#00ff88' },
              { label: 'Buyers', value: stats.totalBuyers, color: '#0088ff' },
              { label: 'Total Contacts', value: stats.totalContacts, color: '#aaa' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#111', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#aaa' }}>{item.label}</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        <ActivityFeed events={stats.recentLeads} />
      </div>
    </div>
  );
};

export default CRMDashboard;
