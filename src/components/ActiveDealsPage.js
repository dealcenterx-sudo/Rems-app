import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import DealEditModal from './DealEditModal';

// Filter icon
const FilterIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
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
  'clear-to-close': { label: 'Clear to Close', color: '#00ff88' }
};

const ActiveDealsPage = () => {
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, searchQuery, statusFilter]);

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
        const data = doc.data();
        // Only include active deals (not closed or dead)
        if (data.status !== 'closed' && data.status !== 'dead') {
          dealsData.push({
            id: doc.id,
            ...data
          });
        }
      });

      setDeals(dealsData);
      setFilteredDeals(dealsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading deals:', error);
      setLoading(false);
    }
  };

  const filterDeals = () => {
    let filtered = [...deals];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(deal => 
        deal.propertyAddress?.toLowerCase().includes(query) ||
        deal.buyerName?.toLowerCase().includes(query) ||
        deal.sellerName?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(deal => deal.status === statusFilter);
    }

    setFilteredDeals(filtered);
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
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

  const getDaysInStatus = (deal) => {
    if (!deal.updatedAt && !deal.createdAt) return 0;
    const date = new Date(deal.updatedAt || deal.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
        Loading active deals...
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Header with Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: '0 0 5px 0' }}>
            Active Deals
          </h2>
          <p style={{ fontSize: '13px', color: '#666666', margin: 0 }}>
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''} in progress
          </p>
        </div>
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '15px 20px'
        }}>
          <div style={{ fontSize: '11px', color: '#666666', marginBottom: '5px' }}>
            Total Pipeline Value
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#00ff88' }}>
            {formatCurrency(filteredDeals.reduce((sum, d) => sum + (d.purchasePrice || 0), 0))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '4px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '15px'
        }}>
          <FilterIcon size={18} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff' }}>Filters</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
          {/* Search */}
          <div className="form-field" style={{ margin: 0 }}>
            <label style={{ marginBottom: '8px' }}>Search</label>
            <input
              type="text"
              placeholder="Search by property, buyer, or seller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="form-field" style={{ margin: 0 }}>
            <label style={{ marginBottom: '8px' }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              {Object.entries(DEAL_STATUSES).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Deals Table */}
      {filteredDeals.length === 0 ? (
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '40px',
          textAlign: 'center',
          color: '#666666'
        }}>
          {deals.length === 0 
            ? 'No active deals yet. Create your first deal!' 
            : 'No deals match your filters.'}
        </div>
      ) : (
        <div className="tasks-table">
          <div className="table-header" style={{
            gridTemplateColumns: '250px 150px 150px 120px 120px 100px 120px'
          }}>
            <div>Property</div>
            <div>Buyer</div>
            <div>Seller</div>
            <div>Status</div>
            <div>Value</div>
            <div>Days Active</div>
            <div>Close Date</div>
          </div>

          {filteredDeals.map((deal) => {
            const statusConfig = DEAL_STATUSES[deal.status] || DEAL_STATUSES['lead'];
            const daysActive = getDaysInStatus(deal);
            
            return (
              <div
                key={deal.id}
                className="table-row"
                onClick={() => setSelectedDeal(deal)}
                style={{
                  gridTemplateColumns: '250px 150px 150px 120px 120px 100px 120px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                  {deal.propertyAddress || 'No address'}
                </div>

                <div style={{ fontSize: '12px', color: '#0088ff' }}>
                  {deal.buyerName || 'N/A'}
                </div>

                <div style={{ fontSize: '12px', color: '#00ff88' }}>
                  {deal.sellerName || 'N/A'}
                </div>

                <div>
                  <span style={{
                    fontSize: '10px',
                    color: statusConfig.color,
                    background: `${statusConfig.color}15`,
                    padding: '4px 8px',
                    borderRadius: '3px',
                    textTransform: 'uppercase',
                    fontWeight: '700'
                  }}>
                    {statusConfig.label}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#ffaa00', fontWeight: '600' }}>
                  {formatCurrency(deal.purchasePrice)}
                </div>

                <div style={{
                  fontSize: '12px',
                  color: daysActive > 30 ? '#ff6600' : '#888888',
                  fontWeight: daysActive > 30 ? '600' : '400'
                }}>
                  {daysActive} days
                </div>

                <div style={{ fontSize: '12px', color: '#888888' }}>
                  {formatDate(deal.expectedCloseDate)}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

export default ActiveDealsPage;
