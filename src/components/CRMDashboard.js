import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

// Icons
const TrendingUpIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const DollarIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const ActivityIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const ClockIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const CheckCircleIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const UsersIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const HomeIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const CRMDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDeals: 0,
    activeDeals: 0,
    closedDeals: 0,
    totalRevenue: 0,
    avgDealSize: 0,
    conversionRate: 0,
    totalContacts: 0,
    totalProperties: 0,
    propertiesActive: 0,
    avgDaysToClose: 0
  });
  const [pipeline, setPipeline] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    try {
      const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';

      // Load Deals
      const dealsQuery = isAdmin
        ? query(collection(db, 'deals'), orderBy('createdAt', 'desc'))
        : query(
            collection(db, 'deals'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc')
          );

      const dealsSnapshot = await getDocs(dealsQuery);
      const deals = [];
      dealsSnapshot.forEach((doc) => {
        deals.push({ id: doc.id, ...doc.data() });
      });

      // Load Contacts
      const contactsQuery = isAdmin
        ? query(collection(db, 'contacts'))
        : query(collection(db, 'contacts'), where('userId', '==', auth.currentUser.uid));

      const contactsSnapshot = await getDocs(contactsQuery);
      const contacts = contactsSnapshot.size;

      // Load Properties
      const propertiesQuery = isAdmin
        ? query(collection(db, 'properties'))
        : query(collection(db, 'properties'), where('userId', '==', auth.currentUser.uid));

      const propertiesSnapshot = await getDocs(propertiesQuery);
      const properties = [];
      propertiesSnapshot.forEach((doc) => {
        properties.push({ id: doc.id, ...doc.data() });
      });

      // Calculate stats
      const activeDeals = deals.filter(d => d.status !== 'closed' && d.status !== 'dead');
      const closedDeals = deals.filter(d => d.status === 'closed');
      const totalRevenue = closedDeals.reduce((sum, d) => sum + (d.commission?.agentEarnings || 0), 0);
      const avgDealSize = closedDeals.length > 0 ? totalRevenue / closedDeals.length : 0;
      const conversionRate = deals.length > 0 ? (closedDeals.length / deals.length) * 100 : 0;

      // Calculate avg days to close
      const closedWithDates = closedDeals.filter(d => d.createdAt && (d.actualCloseDate || d.expectedCloseDate));
      const totalDays = closedWithDates.reduce((sum, d) => {
        const start = new Date(d.createdAt);
        const end = new Date(d.actualCloseDate || d.expectedCloseDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      const avgDaysToClose = closedWithDates.length > 0 ? Math.round(totalDays / closedWithDates.length) : 0;

      setStats({
        totalDeals: deals.length,
        activeDeals: activeDeals.length,
        closedDeals: closedDeals.length,
        totalRevenue,
        avgDealSize,
        conversionRate,
        totalContacts: contacts,
        totalProperties: properties.length,
        propertiesActive: properties.filter(p => p.status === 'active').length,
        avgDaysToClose
      });

      // Calculate pipeline
      const pipelineStages = [
        { stage: 'lead', label: 'Leads', count: 0 },
        { stage: 'qualified', label: 'Qualified', count: 0 },
        { stage: 'active-search', label: 'Active', count: 0 },
        { stage: 'offer-submitted', label: 'Offers', count: 0 },
        { stage: 'under-contract', label: 'Contracts', count: 0 },
        { stage: 'closed', label: 'Closed', count: 0 }
      ];

      deals.forEach(deal => {
        const stage = pipelineStages.find(s => s.stage === deal.status);
        if (stage) stage.count++;
      });

      setPipeline(pipelineStages);

      // Generate recent activity
      const activity = [];
      
      // Recent deals
      deals.slice(0, 5).forEach(deal => {
        activity.push({
          type: 'deal',
          action: deal.status === 'closed' ? 'closed' : 'updated',
          title: deal.propertyAddress || 'Unknown Property',
          subtitle: `${deal.buyerName || 'N/A'} ↔ ${deal.sellerName || 'N/A'}`,
          time: deal.updatedAt || deal.createdAt,
          color: deal.status === 'closed' ? '#00ff88' : '#0088ff'
        });
      });

      // Recent properties
      properties.slice(0, 3).forEach(prop => {
        activity.push({
          type: 'property',
          action: 'listed',
          title: prop.address?.street || 'Unknown Address',
          subtitle: `${prop.address?.city || ''}, ${prop.address?.state || ''} • $${(prop.listPrice || 0).toLocaleString()}`,
          time: prop.createdAt,
          color: '#ffaa00'
        });
      });

      // Sort by time
      activity.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivity(activity.slice(0, 10));

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        color: '#666666'
      }}>
        Loading CRM Dashboard...
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', margin: '0 0 5px 0' }}>
          CRM Dashboard
        </h2>
        <p style={{ fontSize: '13px', color: '#666666', margin: 0 }}>
          Sales pipeline and performance overview
        </p>
      </div>

      {/* Top Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Total Revenue */}
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#00ff8815',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarIcon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Revenue
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ff88' }}>
                {formatCurrency(stats.totalRevenue)}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#888888' }}>
            Avg: {formatCurrency(stats.avgDealSize)} per deal
          </div>
        </div>

        {/* Active Deals */}
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#0088ff15',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUpIcon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Deals
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0088ff' }}>
                {stats.activeDeals}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#888888' }}>
            {stats.closedDeals} closed this period
          </div>
        </div>

        {/* Conversion Rate */}
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#ffaa0015',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircleIcon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Conversion Rate
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffaa00' }}>
                {stats.conversionRate.toFixed(1)}%
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#888888' }}>
            {stats.closedDeals} of {stats.totalDeals} deals
          </div>
        </div>

        {/* Avg Days to Close */}
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: '#aa00ff15',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ClockIcon size={22} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Avg Days to Close
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#aa00ff' }}>
                {stats.avgDaysToClose}
              </div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#888888' }}>
            Based on closed deals
          </div>
        </div>
      </div>

      {/* Second Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Total Contacts */}
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: '#0088ff15',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UsersIcon size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>
              {stats.totalContacts}
            </div>
            <div style={{ fontSize: '11px', color: '#666666' }}>Total Contacts</div>
          </div>
        </div>

        {/* Total Properties */}
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: '#ffaa0015',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HomeIcon size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>
              {stats.totalProperties}
            </div>
            <div style={{ fontSize: '11px', color: '#666666' }}>Total Properties</div>
          </div>
        </div>

        {/* Active Listings */}
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: '#00ff8815',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HomeIcon size={20} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#00ff88' }}>
              {stats.propertiesActive}
            </div>
            <div style={{ fontSize: '11px', color: '#666666' }}>Active Listings</div>
          </div>
        </div>
      </div>

      {/* Pipeline & Activity */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
      }}>
        {/* Sales Pipeline */}
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '25px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <TrendingUpIcon size={20} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Sales Pipeline
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pipeline.map((stage, idx) => (
              <div key={stage.stage}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}>
                  <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                    {stage.label}
                  </span>
                  <span style={{ fontSize: '13px', color: '#00ff88', fontWeight: '700' }}>
                    {stage.count}
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#1a1a1a',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: stats.totalDeals > 0 ? `${(stage.count / stats.totalDeals) * 100}%` : '0%',
                    height: '100%',
                    background: `linear-gradient(90deg, #00ff88 0%, #0088ff ${idx * 20}%)`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '25px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <ActivityIcon size={20} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
              Recent Activity
            </h3>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {recentActivity.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                color: '#666666',
                fontSize: '12px'
              }}>
                No recent activity
              </div>
            ) : (
              recentActivity.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    background: '#0f0f0f',
                    borderRadius: '4px',
                    border: '1px solid #1a1a1a'
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: item.color,
                    borderRadius: '50%',
                    marginTop: '6px',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      color: '#ffffff',
                      fontWeight: '600',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.title}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#888888',
                      marginBottom: '4px'
                    }}>
                      {item.subtitle}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: '#666666'
                    }}>
                      {formatTimeAgo(item.time)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;
