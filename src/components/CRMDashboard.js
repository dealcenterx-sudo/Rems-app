import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';

const BarChart = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="card-surface">
      <h3 style={{ fontSize: '16px', color: '#ffffff', marginBottom: '20px', fontWeight: '600' }}>{title}</h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', height: '200px' }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: item.color || '#00ff88' }}>{item.value}</div>
            <div style={{ width: '100%', height: `${(item.value / maxValue) * 150}px`, background: `linear-gradient(180deg, ${item.color || '#00ff88'}, ${item.color || '#00ff88'}88)`, borderRadius: '4px 4px 0 0', transition: 'all 0.3s ease' }}></div>
            <div style={{ fontSize: '11px', color: '#888888', textAlign: 'center', wordBreak: 'break-word' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PieChart = ({ data, title }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="card-surface">
      <h3 style={{ fontSize: '16px', color: '#ffffff', marginBottom: '20px', fontWeight: '600' }}>{title}</h3>
      <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
        <div style={{ width: '150px', height: '150px', borderRadius: '50%', background: `conic-gradient(${data.map((item, idx) => { const prevTotal = data.slice(0, idx).reduce((sum, d) => sum + d.value, 0); const percentage = (item.value / total) * 100; const prevPercentage = (prevTotal / total) * 100; return `${item.color} ${prevPercentage}% ${prevPercentage + percentage}%`; }).join(', ')})`, position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80px', height: '80px', borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff' }}>{total}</div>
            <div style={{ fontSize: '10px', color: '#888888' }}>Total</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {data.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: item.color }}></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>{item.label}</div>
                <div style={{ fontSize: '11px', color: '#888888' }}>{item.value} ({((item.value / total) * 100).toFixed(1)}%)</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon, color }) => (
  <div className="card-surface" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: '12px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{icon}</div>
    </div>
    <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffffff' }}>{value}</div>
  </div>
);

const CRMDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalContacts: 0, totalDeals: 0, totalSellers: 0, totalBuyers: 0, dealsByStatus: [], buyersByType: [], conversionRate: 0 });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';
      const contactsQuery = isAdmin ? query(collection(db, 'contacts')) : query(collection(db, 'contacts'), where('userId', '==', auth.currentUser.uid));
      const contactsSnapshot = await getDocs(contactsQuery);
      const contacts = [];
      contactsSnapshot.forEach((doc) => { contacts.push({ id: doc.id, ...doc.data() }); });

      const dealsQuery = isAdmin ? query(collection(db, 'deals')) : query(collection(db, 'deals'), where('userId', '==', auth.currentUser.uid));
      const dealsSnapshot = await getDocs(dealsQuery);
      const deals = [];
      dealsSnapshot.forEach((doc) => { deals.push({ id: doc.id, ...doc.data() }); });

      const sellers = contacts.filter(c => c.contactType === 'seller');
      const buyers = contacts.filter(c => c.contactType === 'buyer');
      
      const statusCounts = { new: deals.filter(d => d.status === 'new').length, active: deals.filter(d => d.status === 'active').length, pending: deals.filter(d => d.status === 'pending').length, closed: deals.filter(d => d.status === 'closed').length };
      const dealsByStatus = [
        { label: 'New', value: statusCounts.new, color: '#ffaa00' },
        { label: 'Active', value: statusCounts.active, color: '#00ff88' },
        { label: 'Pending', value: statusCounts.pending, color: '#0088ff' },
        { label: 'Closed', value: statusCounts.closed, color: '#aa00ff' }
      ];

      const flippers = buyers.filter(b => b.buyerType === 'flipper').length;
      const builders = buyers.filter(b => b.buyerType === 'builder').length;
      const holders = buyers.filter(b => b.buyerType === 'holder').length;
      const buyersByType = [
        { label: 'Flippers', value: flippers, color: '#ff6600' },
        { label: 'Builders', value: builders, color: '#0088ff' },
        { label: 'Holders', value: holders, color: '#aa00ff' }
      ];

      const conversionRate = sellers.length > 0 ? ((deals.length / sellers.length) * 100).toFixed(1) : 0;
      setStats({ totalContacts: contacts.length, totalDeals: deals.length, totalSellers: sellers.length, totalBuyers: buyers.length, dealsByStatus, buyersByType, conversionRate: parseFloat(conversionRate) });
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', marginBottom: '30px' }}>
        <MetricCard label="Total Contacts" value={stats.totalContacts} icon="👥" color="#00ff88" />
        <MetricCard label="Total Deals" value={stats.totalDeals} icon="💼" color="#0088ff" />
        <MetricCard label="Conversion Rate" value={`${stats.conversionRate}%`} icon="📈" color="#ffaa00" />
        <MetricCard label="Active Buyers" value={stats.totalBuyers} icon="🏠" color="#ff6600" />
      </div>
      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', marginBottom: '30px' }}>
        <BarChart data={stats.dealsByStatus} title="Deal Pipeline" />
        <PieChart data={stats.buyersByType} title="Buyer Distribution" />
      </div>
      <div className="card-surface">
        <h3 style={{ fontSize: '16px', color: '#ffffff', marginBottom: '20px', fontWeight: '600' }}>Quick Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div><div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Sellers</div><div style={{ fontSize: '24px', color: '#00ff88', fontWeight: '700' }}>{stats.totalSellers}</div></div>
          <div><div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Buyers</div><div style={{ fontSize: '24px', color: '#0088ff', fontWeight: '700' }}>{stats.totalBuyers}</div></div>
          <div><div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Closed Deals</div><div style={{ fontSize: '24px', color: '#aa00ff', fontWeight: '700' }}>{stats.dealsByStatus.find(d => d.label === 'Closed')?.value || 0}</div></div>
          <div><div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Active Deals</div><div style={{ fontSize: '24px', color: '#00ff88', fontWeight: '700' }}>{stats.dealsByStatus.find(d => d.label === 'Active')?.value || 0}</div></div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;
