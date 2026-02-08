import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import DealEditModal from './DealEditModal';

// Simple icon components for dashboard
const DollarIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const ClockIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const TrendingIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

// Deal status configuration
const DEAL_STATUSES = {
  'lead': { label: 'Lead', color: '#666666' },
  'qualified': { label: 'Qualified', color: '#888888' },
  'active-search': { label: 'Active Search', color: '#0088ff' },
  'offer-submitted': { label: 'Offer Submitted', color: '#ffaa00' },
  'under-contract': { label: 'Under Contract', color: '#ff6600' },
  'pending-inspection': { label: 'Pending Inspection', color: '#aa00ff' },
  'pending-financing': { label: 'Pending Financing', color: '#ff00aa' },
  'pending-title': { label: 'Pending Title', color: '#00aaff' },
  'clear-to-close': { label: 'Clear to Close', color: '#00ff88' },
  'closed': { label: 'Closed', color: '#00ff88' },
  'dead': { label: 'Dead', color: '#ff3333' }
};

const DealsDashboard = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0,
    totalValue: 0
  });

  useEffect(() => {
    loadDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDeals = async () => {
    try {
      const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';

      const dealsQuery = isAdmin
        ? query(collection(db, 'deals'), orderBy('createdAt', 'desc'))
        : query(
            collection(db, 'deals'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc')
          );

      const querySnapshot = await getDocs(dealsQuery);
      const dealsData = [];
      
      querySnapshot.forEach((doc) => {
        dealsData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setDeals(dealsData);
      calculateStats(dealsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading deals:', error);
      setLoading(false);
    }
  };

  const calculateStats = (dealsData) => {
    const stats = {
      total: dealsData.length,
      active: dealsData.filter(d => 
        d.status && d.status !== 'closed' && d.status !== 'dead'
      ).length,
      closed: dealsData.filter(d => d.status === 'closed').length,
      totalValue: dealsData.reduce((sum, d) => sum + (d.purchasePrice || 0), 0)
    };
    setStats(stats);
  };

  // Group deals by status
  const dealsByStatus = deals.reduce((acc, deal) => {
    const status = DEAL_STATUSES[deal.status] ? deal.status : 'lead';
    if (!acc[status]) acc[status] = [];
    acc[status].push(deal);
    return acc;
  }, {});

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Stats Cards */}
      <div className="grid-four" style={{ gap: '20px', marginBottom: '30px' }}>
        <div className="card-surface">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px'
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
              <TrendingIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Deals
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff' }}>
                {stats.total}
              </div>
            </div>
          </div>
        </div>

        <div className="card-surface">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px'
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
              <ClockIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Deals
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0088ff' }}>
                {stats.active}
              </div>
            </div>
          </div>
        </div>

        <div className="card-surface">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px'
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
              ✓
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Closed Deals
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ff88' }}>
                {stats.closed}
              </div>
            </div>
          </div>
        </div>

        <div className="card-surface">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px'
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
              <DollarIcon size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Value
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffaa00' }}>
                {formatCurrency(stats.totalValue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline View */}
      <div className="section">
        <div className="section-title">Deal Pipeline</div>
        
        <div style={{
          display: 'flex',
          gap: '15px',
          overflowX: 'auto',
          paddingBottom: '10px'
        }}>
          {Object.keys(DEAL_STATUSES).filter(status => status !== 'dead').map((status) => {
            const statusConfig = DEAL_STATUSES[status];
            const statusDeals = dealsByStatus[status] || [];
            
            return (
              <div
                key={status}
                className="card-surface"
                style={{ minWidth: '240px', padding: '15px' }}
              >
                {/* Status Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: statusConfig.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {statusConfig.label}
                  </div>
                  <div className="badge" style={{
                    color: statusConfig.color,
                    background: `${statusConfig.color}15`
                  }}>
                    {statusDeals.length}
                  </div>
                </div>

                {/* Deal Cards */}
                {statusDeals.length === 0 ? (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#666666',
                    fontSize: '11px'
                  }}>
                    No deals
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {statusDeals.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedDeal(deal)}
                        className="card-surface"
                        style={{ background: '#0f0f0f', padding: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = statusConfig.color;
                          e.currentTarget.style.background = '#151515';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#1a1a1a';
                          e.currentTarget.style.background = '#0f0f0f';
                        }}
                      >
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#ffffff',
                          marginBottom: '6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {deal.propertyAddress || 'No address'}
                        </div>
                        
                        <div style={{ fontSize: '11px', color: '#888888', marginBottom: '4px' }}>
                          <span style={{ color: '#0088ff' }}>B:</span> {deal.buyerName || 'N/A'}
                        </div>
                        
                        <div style={{ fontSize: '11px', color: '#888888', marginBottom: '8px' }}>
                          <span style={{ color: '#00ff88' }}>S:</span> {deal.sellerName || 'N/A'}
                        </div>
                        
                        {deal.purchasePrice && (
                          <div style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#ffaa00',
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid #1a1a1a'
                          }}>
                            {formatCurrency(deal.purchasePrice)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Deals */}
      <div className="section" style={{ marginTop: '30px' }}>
        <div className="section-title">Recent Deals</div>
        
        {deals.length === 0 ? (
          <div style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '4px',
            padding: '40px',
            textAlign: 'center',
            color: '#666666'
          }}>
            No deals yet. Create your first deal!
          </div>
        ) : (
          <div className="tasks-table">
            <div className="table-header" style={{
              gridTemplateColumns: '250px 150px 150px 120px 150px 120px'
            }}>
              <div>Property</div>
              <div>Buyer</div>
              <div>Seller</div>
              <div>Status</div>
              <div>Value</div>
              <div>Created</div>
            </div>

            {deals.slice(0, 10).map((deal) => {
              const statusConfig = DEAL_STATUSES[deal.status] || DEAL_STATUSES['lead'];
              
              return (
                <div
                  key={deal.id}
                  className="table-row"
                  onClick={() => setSelectedDeal(deal)}
                  style={{
                    gridTemplateColumns: '250px 150px 150px 120px 150px 120px'
                  }}
                >
                  <div data-label="Property" style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                    {deal.propertyAddress || 'No address'}
                  </div>

                  <div data-label="Buyer" style={{ fontSize: '12px', color: '#0088ff' }}>
                    {deal.buyerName || 'N/A'}
                  </div>

                  <div data-label="Seller" style={{ fontSize: '12px', color: '#00ff88' }}>
                    {deal.sellerName || 'N/A'}
                  </div>

                  <div data-label="Status">
                    <span className="badge" style={{ color: statusConfig.color, background: `${statusConfig.color}15` }}>
                      {statusConfig.label}
                    </span>
                  </div>

                  <div data-label="Value" style={{ fontSize: '13px', color: '#ffaa00', fontWeight: '600' }}>
                    {deal.purchasePrice ? formatCurrency(deal.purchasePrice) : 'N/A'}
                  </div>

                  <div data-label="Created" style={{ fontSize: '12px', color: '#888888' }}>
                    {formatDate(deal.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedDeal && (
        <DealEditModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdate={loadDeals}
        />
      )}
    </div>
  );
};

export default DealsDashboard;
