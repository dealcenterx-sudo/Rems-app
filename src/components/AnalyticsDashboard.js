import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AnalyticsDashboard = () => {
  const [deals, setDeals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // 7, 30, 90, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';
      
      // Load deals
      const dealsQuery = isAdmin
        ? query(collection(db, 'deals'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'deals'), where('userId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));
      
      const dealsSnapshot = await getDocs(dealsQuery);
      const dealsData = [];
      dealsSnapshot.forEach((doc) => {
        dealsData.push({ id: doc.id, ...doc.data() });
      });

      // Load properties
      const propertiesQuery = isAdmin
        ? query(collection(db, 'properties'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'properties'), where('userId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));
      
      const propertiesSnapshot = await getDocs(propertiesQuery);
      const propertiesData = [];
      propertiesSnapshot.forEach((doc) => {
        propertiesData.push({ id: doc.id, ...doc.data() });
      });

      // Load contacts
      const contactsQuery = isAdmin
        ? query(collection(db, 'contacts'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'contacts'), where('userId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));
      
      const contactsSnapshot = await getDocs(contactsQuery);
      const contactsData = [];
      contactsSnapshot.forEach((doc) => {
        contactsData.push({ id: doc.id, ...doc.data() });
      });
      
      setDeals(dealsData);
      setProperties(propertiesData);
      setContacts(contactsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const getDateRangeStart = () => {
    const now = new Date();
    if (dateRange === 'custom' && customStartDate) {
      return new Date(customStartDate);
    }
    const daysAgo = parseInt(dateRange);
    return new Date(now.setDate(now.getDate() - daysAgo));
  };

  const getDateRangeEnd = () => {
    if (dateRange === 'custom' && customEndDate) {
      return new Date(customEndDate);
    }
    return new Date();
  };

  const filterByDateRange = (items) => {
    const startDate = getDateRangeStart();
    const endDate = getDateRangeEnd();
    
    return items.filter(item => {
      if (!item.createdAt) return false;
      const itemDate = new Date(item.createdAt);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const filteredDeals = filterByDateRange(deals);
  const filteredProperties = filterByDateRange(properties);
  // eslint-disable-next-line no-unused-vars
  const filteredContacts = filterByDateRange(contacts);

  // Analytics Calculations
  const totalRevenue = filteredProperties
    .filter(p => p.status === 'sold')
    .reduce((sum, p) => sum + (p.price || 0), 0);

  const avgDealSize = filteredProperties.filter(p => p.status === 'sold').length > 0
    ? totalRevenue / filteredProperties.filter(p => p.status === 'sold').length
    : 0;

  const closedDeals = filteredDeals.filter(d => d.status === 'closed').length;
  // eslint-disable-next-line no-unused-vars
  const activeDeals = filteredDeals.filter(d => d.status === 'active').length;
  const conversionRate = filteredDeals.length > 0 
    ? ((closedDeals / filteredDeals.length) * 100).toFixed(1)
    : 0;

  // Deal velocity (avg days to close)
  const closedDealsWithDates = filteredDeals.filter(d => d.status === 'closed' && d.createdAt && d.updatedAt);
  const avgDaysToClose = closedDealsWithDates.length > 0
    ? closedDealsWithDates.reduce((sum, d) => {
        const created = new Date(d.createdAt);
        const updated = new Date(d.updatedAt);
        const days = Math.floor((updated - created) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / closedDealsWithDates.length
    : 0;

  // Deal status breakdown
  const dealStatusData = [
    { name: 'New', value: filteredDeals.filter(d => d.status === 'new').length, color: '#ffaa00' },
    { name: 'Active', value: filteredDeals.filter(d => d.status === 'active').length, color: '#00ff88' },
    { name: 'Pending', value: filteredDeals.filter(d => d.status === 'pending').length, color: '#0088ff' },
    { name: 'Closed', value: filteredDeals.filter(d => d.status === 'closed').length, color: '#aa00ff' }
  ].filter(item => item.value > 0);

  // Property status breakdown
  const propertyStatusData = [
    { name: 'Available', value: filteredProperties.filter(p => p.status === 'available').length, color: '#00ff88' },
    { name: 'Under Contract', value: filteredProperties.filter(p => p.status === 'under-contract').length, color: '#ffaa00' },
    { name: 'Sold', value: filteredProperties.filter(p => p.status === 'sold').length, color: '#ff3333' }
  ].filter(item => item.value > 0);

  // Monthly trend data (last 6 months of filtered range)
  const getMonthlyTrend = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      const monthDeals = deals.filter(d => {
        if (!d.createdAt) return false;
        const dealDate = new Date(d.createdAt);
        return dealDate.getMonth() === date.getMonth() && 
               dealDate.getFullYear() === date.getFullYear();
      });

      const monthProperties = properties.filter(p => {
        if (!p.createdAt) return false;
        const propDate = new Date(p.createdAt);
        return propDate.getMonth() === date.getMonth() && 
               propDate.getFullYear() === date.getFullYear();
      });

      months.push({
        month: monthName,
        deals: monthDeals.length,
        properties: monthProperties.length,
        revenue: monthProperties
          .filter(p => p.status === 'sold')
          .reduce((sum, p) => sum + (p.price || 0), 0) / 1000 // in thousands
      });
    }
    
    return months;
  };

  const monthlyTrendData = getMonthlyTrend();

  // Top buyers by deal count
  const topBuyers = filteredDeals.reduce((acc, deal) => {
    const buyer = deal.buyerName || 'Unknown';
    acc[buyer] = (acc[buyer] || 0) + 1;
    return acc;
  }, {});

  const topBuyersData = Object.entries(topBuyers)
    .map(([name, count]) => ({ name, deals: count }))
    .sort((a, b) => b.deals - a.deals)
    .slice(0, 5);

  // Average property price by type
  const avgPriceByType = properties.reduce((acc, prop) => {
    const type = prop.propertyType || 'unknown';
    if (!acc[type]) {
      acc[type] = { total: 0, count: 0 };
    }
    acc[type].total += prop.price || 0;
    acc[type].count += 1;
    return acc;
  }, {});

  const avgPriceData = Object.entries(avgPriceByType)
    .map(([type, data]) => ({
      type: type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      avgPrice: Math.round(data.total / data.count / 1000) // in thousands
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice);

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
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '24px', color: '#ffffff', fontWeight: '700', margin: 0, marginBottom: '8px' }}>
          Analytics Dashboard
        </h2>
        <p style={{ fontSize: '14px', color: '#888888', margin: 0 }}>
          Real-time business intelligence and performance metrics
        </p>
      </div>

      {/* Date Range Filters */}
      <div className="card-surface" style={{ padding: '20px', marginBottom: '30px' }}>
        <label style={{ fontSize: '11px', color: '#888888', display: 'block', marginBottom: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Date Range
        </label>
        <div className="filters-row">
          {['7', '30', '90', 'custom'].map((range) => (
            <div
              key={range}
              onClick={() => setDateRange(range)}
              className={`filter-chip ${dateRange === range ? 'active' : ''}`}
              style={{ textTransform: 'capitalize' }}
            >
              <span className="chip-label">{range === 'custom' ? 'Custom' : `Last ${range} Days`}</span>
            </div>
          ))}
          
          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: '10px 15px',
                  background: '#0f0f0f',
                  border: '1px solid #1a1a1a',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px'
                }}
              />
              <span style={{ color: '#888888' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: '10px 15px',
                  background: '#0f0f0f',
                  border: '1px solid #1a1a1a',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px'
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: '30px' }}>
        {/* Total Revenue */}
        <div className="card-surface" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.05 }}>💰</div>
          <div style={{ fontSize: '12px', color: '#00ff88', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Total Revenue
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
            ${(totalRevenue / 1000000).toFixed(2)}M
          </div>
          <div style={{ fontSize: '11px', color: '#888888' }}>
            From {filteredProperties.filter(p => p.status === 'sold').length} sold properties
          </div>
        </div>

        {/* Avg Deal Size */}
        <div className="card-surface" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.05 }}>📊</div>
          <div style={{ fontSize: '12px', color: '#0088ff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Avg Deal Size
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
            ${(avgDealSize / 1000).toFixed(0)}K
          </div>
          <div style={{ fontSize: '11px', color: '#888888' }}>
            Average property value
          </div>
        </div>

        {/* Deal Velocity */}
        <div className="card-surface" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.05 }}>⚡</div>
          <div style={{ fontSize: '12px', color: '#ffaa00', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Deal Velocity
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
            {Math.round(avgDaysToClose)} days
          </div>
          <div style={{ fontSize: '11px', color: '#888888' }}>
            Average time to close
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="card-surface" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.05 }}>🎯</div>
          <div style={{ fontSize: '12px', color: '#aa00ff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Conversion Rate
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
            {conversionRate}%
          </div>
          <div style={{ fontSize: '11px', color: '#888888' }}>
            {closedDeals} closed / {filteredDeals.length} total
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', marginBottom: '30px' }}>
        {/* Monthly Trend */}
        <div className="card-surface">
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: '700', marginBottom: '20px' }}>
            Monthly Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="month" stroke="#888888" style={{ fontSize: '12px' }} />
              <YAxis stroke="#888888" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff' }}
                labelStyle={{ color: '#888888' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#888888' }} />
              <Line type="monotone" dataKey="deals" stroke="#00ff88" strokeWidth={2} name="Deals" />
              <Line type="monotone" dataKey="properties" stroke="#0088ff" strokeWidth={2} name="Properties" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div className="card-surface">
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: '700', marginBottom: '20px' }}>
            Revenue Trend (in $1000s)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="month" stroke="#888888" style={{ fontSize: '12px' }} />
              <YAxis stroke="#888888" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff' }}
                labelStyle={{ color: '#888888' }}
              />
              <Bar dataKey="revenue" fill="#00ff88" radius={[8, 8, 0, 0]} name="Revenue ($1000s)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', marginBottom: '30px' }}>
        {/* Deal Status Breakdown */}
        {dealStatusData.length > 0 && (
          <div className="card-surface">
            <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: '700', marginBottom: '20px' }}>
              Deal Status Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dealStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dealStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Property Status Breakdown */}
        {propertyStatusData.length > 0 && (
          <div className="card-surface">
            <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: '700', marginBottom: '20px' }}>
              Property Status Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={propertyStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {propertyStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Avg Price by Type */}
        {avgPriceData.length > 0 && (
          <div className="card-surface">
            <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: '700', marginBottom: '20px' }}>
              Avg Price by Type ($1000s)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={avgPriceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis type="number" stroke="#888888" style={{ fontSize: '11px' }} />
                <YAxis dataKey="type" type="category" stroke="#888888" style={{ fontSize: '11px' }} width={100} />
                <Tooltip 
                  contentStyle={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff' }}
                  labelStyle={{ color: '#888888' }}
                />
                <Bar dataKey="avgPrice" fill="#0088ff" radius={[0, 8, 8, 0]} name="Avg Price ($1000s)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Performers */}
      {topBuyersData.length > 0 && (
        <div className="card-surface">
          <h3 style={{ fontSize: '16px', color: '#ffffff', fontWeight: '700', marginBottom: '20px' }}>
            Top Buyers by Deal Count
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {topBuyersData.map((buyer, index) => (
              <div 
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: '#0f0f0f',
                  border: '1px solid #1a1a1a',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00ff88'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1a1a1a'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    background: index === 0 ? 'linear-gradient(135deg, #00ff88, #00cc6a)' : '#1a1a1a',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: index === 0 ? '#000000' : '#888888'
                  }}>
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                      {buyer.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888888' }}>
                      {buyer.deals} deal{buyer.deals > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: index === 0 ? '#00ff88' : '#ffffff'
                }}>
                  {buyer.deals}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Button */}
      <div style={{ marginTop: '30px', textAlign: 'center' }}>
        <button
          onClick={() => alert('PDF export feature coming soon!')}
          className="btn-secondary"
        >
          📥 Export Report to PDF
        </button>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
