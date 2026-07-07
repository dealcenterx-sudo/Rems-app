import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { isAdminUser } from '../utils/helpers';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from './Toast';
import { captureError } from '../utils/observability';

const AnalyticsDashboard = () => {
  const toast = useToast();
  const [deals, setDeals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // 7, 30, 90, custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [queryError, setQueryError] = useState('');

  const getDateRangeBounds = useCallback(() => {
    const now = new Date();
    let start = new Date(now);
    let end;

    const parseDate = (value, isEnd = false) => {
      if (!value) return null;
      const parsed = new Date(`${value}T${isEnd ? '23:59:59.999' : '00:00:00'}`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    if (dateRange === 'custom') {
      start = parseDate(customStartDate);
      end = parseDate(customEndDate, true);
      if (start || end) {
        return { start, end };
      }
      return { start: null, end: null };
    }

    const daysAgo = parseInt(dateRange, 10);
    if (Number.isNaN(daysAgo)) return { start: null, end: null };

    start.setDate(start.getDate() - daysAgo);
    return { start, end: null };
  }, [dateRange, customStartDate, customEndDate]);

  const loadCollectionInRange = useCallback(async (collectionName, userFilter) => {
    const { start, end } = getDateRangeBounds();
    const getArgs = (includeDateBounds = true, includeOrderBy = true) => {
      const args = [collection(db, collectionName), ...userFilter];
      if (includeDateBounds && start) args.push(where('createdAt', '>=', start.toISOString()));
      if (includeDateBounds && end) args.push(where('createdAt', '<=', end.toISOString()));
      if (includeOrderBy) args.push(orderBy('createdAt', 'desc'));
      return args;
    };

    const sortByCreatedAtDesc = (items) =>
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    try {
      const snapshot = await getDocs(query(...getArgs(true)));
      return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (error) {
      if ((error?.code === 'failed-precondition') || /index/i.test(String(error?.message || ''))) {
        setQueryError(`Analytics is using a slower fallback for ${collectionName} while indexes finish. Results remain available.`);
        captureError(error, {
          feature: 'analytics-index-fallback',
          collectionName,
          hasStartBound: Boolean(start),
          hasEndBound: Boolean(end),
          userScoped: userFilter.length > 0
        });
        // Equality-only query needs no composite index; filter and sort locally.
        const snapshot = await getDocs(query(...getArgs(false, false)));
        return sortByCreatedAtDesc(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
          .filter((item) => {
            if (!start && !end) return true;
            const itemDate = item.createdAt ? new Date(item.createdAt) : null;
            if (!itemDate || Number.isNaN(itemDate.getTime())) return false;
            if (start && itemDate < start) return false;
            if (end && itemDate > end) return false;
            return true;
          });
      }
      throw error;
    }
  }, [getDateRangeBounds]);

  const handleExportCSV = () => {
    if (deals.length === 0 && properties.length === 0) {
      toast.info('Nothing to export for the selected date range');
      return;
    }
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Type', 'Address', 'Status', 'Price', 'Buyer', 'Seller', 'Created'],
      ...deals.map((d) => ['Deal', d.propertyAddress, d.status, d.purchasePrice, d.buyerName, d.sellerName, d.createdAt]),
      ...properties.map((p) => ['Property', [p.address, p.city, p.state].filter(Boolean).join(', '), p.status, p.price, '', p.sellerName, p.createdAt])
    ];
    const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rems-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${deals.length + properties.length} records`);
  };

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setQueryError('');
      const isAdmin = isAdminUser();
      const userFilter = isAdmin ? [] : [where('userId', '==', auth.currentUser?.uid)];
      const [dealsData, propertiesData] = await Promise.all([
        loadCollectionInRange('deals', userFilter),
        loadCollectionInRange('properties', userFilter)
      ]);

      setDeals(dealsData);
      setProperties(propertiesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load analytics data. Please retry.');
      setLoading(false);
    }
  }, [loadCollectionInRange, toast]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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

  // All analytics derived data is memoised — recomputes only when raw data or date range changes
  const analytics = useMemo(() => {
    const filteredDeals = filterByDateRange(deals);
    const filteredProperties = filterByDateRange(properties);

    const soldProperties = [];
    const dealStatusByType = { new: 0, active: 0, pending: 0, closed: 0 };
    const propertyStatusByType = { available: 0, 'under-contract': 0, sold: 0 };
    const buyerTotals = Object.create(null);
    const propertyTypeTotals = Object.create(null);
    const monthDealTotals = Object.create(null);
    const monthPropertyTotals = Object.create(null);
    const monthRevenueTotals = Object.create(null);
    let totalRevenue = 0;
    let closedDeals = 0;
    let totalDaysToClose = 0;
    let closedWithDateCount = 0;

    filteredDeals.forEach((deal) => {
      const status = deal.status || 'unknown';
      if (dealStatusByType[status] !== undefined) {
        dealStatusByType[status] += 1;
      }
      if (status === 'closed') {
        closedDeals += 1;
        const createdAt = deal.createdAt ? new Date(deal.createdAt) : null;
        const updatedAt = deal.updatedAt ? new Date(deal.updatedAt) : null;
        if (createdAt && updatedAt && !Number.isNaN(createdAt.getTime()) && !Number.isNaN(updatedAt.getTime()) && updatedAt >= createdAt) {
          totalDaysToClose += Math.floor((updatedAt - createdAt) / (1000 * 60 * 60 * 24));
          closedWithDateCount += 1;
        }
      }

      if (deal.createdAt) {
        const created = new Date(deal.createdAt);
        if (!Number.isNaN(created.getTime())) {
          const monthKey = `${created.getFullYear()}-${String(created.getMonth()).padStart(2, '0')}`;
          monthDealTotals[monthKey] = (monthDealTotals[monthKey] || 0) + 1;
        }
      }

      const buyer = deal.buyerName || 'Unknown';
      buyerTotals[buyer] = (buyerTotals[buyer] || 0) + 1;
    });

    filteredProperties.forEach((property) => {
      if (property.status === 'sold') {
        soldProperties.push(property);
        totalRevenue += (property.price || 0);
      }
      const status = property.status || 'unknown';
      if (propertyStatusByType[status] !== undefined) {
        propertyStatusByType[status] += 1;
      }

      if (property.createdAt) {
        const created = new Date(property.createdAt);
        if (!Number.isNaN(created.getTime())) {
          const monthKey = `${created.getFullYear()}-${String(created.getMonth()).padStart(2, '0')}`;
          monthPropertyTotals[monthKey] = (monthPropertyTotals[monthKey] || 0) + 1;
          if (property.status === 'sold') {
            monthRevenueTotals[monthKey] = (monthRevenueTotals[monthKey] || 0) + (property.price || 0);
          }
        }
      }

      const type = property.propertyType || 'unknown';
      if (!propertyTypeTotals[type]) {
        propertyTypeTotals[type] = { total: 0, count: 0 };
      }
      propertyTypeTotals[type].total += (property.price || 0);
      propertyTypeTotals[type].count += 1;
    });

    const avgDealSize = soldProperties.length > 0 ? (totalRevenue / soldProperties.length) : 0;
    const conversionRate = filteredDeals.length > 0 ? ((closedDeals / filteredDeals.length) * 100).toFixed(1) : 0;
    const avgDaysToClose = closedWithDateCount > 0 ? (totalDaysToClose / closedWithDateCount) : 0;

    const dealStatusData = [
      { name: 'New', value: dealStatusByType.new, color: '#ffaa00' },
      { name: 'Active', value: dealStatusByType.active, color: '#00ff88' },
      { name: 'Pending', value: dealStatusByType.pending, color: '#0088ff' },
      { name: 'Closed', value: dealStatusByType.closed, color: '#aa00ff' }
    ].filter((item) => item.value > 0);

    const propertyStatusData = [
      { name: 'Available', value: propertyStatusByType.available, color: '#00ff88' },
      { name: 'Under Contract', value: propertyStatusByType['under-contract'], color: '#ffaa00' },
      { name: 'Sold', value: propertyStatusByType.sold, color: '#ff3333' }
    ].filter((item) => item.value > 0);

    const now = new Date();
    const monthlyTrendData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      return {
        month: monthName,
        deals: monthDealTotals[key] || 0,
        properties: monthPropertyTotals[key] || 0,
        revenue: (monthRevenueTotals[key] || 0) / 1000
      };
    });

    const topBuyersData = Object.entries(
      buyerTotals
    ).map(([name, count]) => ({ name, deals: count })).sort((a, b) => b.deals - a.deals).slice(0, 5);

    const avgPriceData = Object.entries(
      propertyTypeTotals
    ).map(([type, data]) => ({
      type: type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      avgPrice: Math.round(data.total / data.count / 1000)
    })).sort((a, b) => b.avgPrice - a.avgPrice);

    return {
      filteredDeals, filteredProperties,
      totalRevenue, avgDealSize, closedDeals, conversionRate, avgDaysToClose,
      dealStatusData, propertyStatusData, monthlyTrendData, topBuyersData, avgPriceData
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, properties, dateRange, customStartDate, customEndDate]);

  const {
    filteredDeals, filteredProperties,
    totalRevenue, avgDealSize, closedDeals, conversionRate, avgDaysToClose,
    dealStatusData, propertyStatusData, monthlyTrendData, topBuyersData, avgPriceData
  } = analytics;

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
        {queryError && (
          <div className="status-banner status-banner-warning" role="status" style={{ marginBottom: '12px' }}>
            {queryError}
          </div>
        )}
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
          onClick={handleExportCSV}
          className="btn-secondary"
        >
          📥 Export Report (CSV)
        </button>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
