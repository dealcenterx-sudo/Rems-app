import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import DealEditModal from './DealEditModal';

const ClosedDealsPage = () => {
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, searchQuery]);

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
        // Only include closed deals
        if (data.status === 'closed') {
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

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(deal => 
        deal.propertyAddress?.toLowerCase().includes(query) ||
        deal.buyerName?.toLowerCase().includes(query) ||
        deal.sellerName?.toLowerCase().includes(query)
      );
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

  const totalRevenue = filteredDeals.reduce((sum, d) => sum + (d.commission?.agentEarnings || 0), 0);
  const totalVolume = filteredDeals.reduce((sum, d) => sum + (d.purchasePrice || 0), 0);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        color: '#666666'
      }}>
        Loading closed deals...
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Header with Stats */}
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: '0 0 20px 0' }}>
          Closed Deals
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px'
        }}>
          <div style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '4px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '11px', color: '#666666', marginBottom: '8px', textTransform: 'uppercase' }}>
              Total Closed
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#00ff88' }}>
              {filteredDeals.length}
            </div>
          </div>

          <div style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '4px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '11px', color: '#666666', marginBottom: '8px', textTransform: 'uppercase' }}>
              Total Volume
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0088ff' }}>
              {formatCurrency(totalVolume)}
            </div>
          </div>

          <div style={{
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '4px',
            padding: '20px'
          }}>
            <div style={{ fontSize: '11px', color: '#666666', marginBottom: '8px', textTransform: 'uppercase' }}>
              Total Earnings
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffaa00' }}>
              {formatCurrency(totalRevenue)}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '4px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div className="form-field" style={{ margin: 0 }}>
          <label style={{ marginBottom: '8px' }}>Search Closed Deals</label>
          <input
            type="text"
            placeholder="Search by property, buyer, or seller..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
            ? 'No closed deals yet. Keep working those active deals!' 
            : 'No closed deals match your search.'}
        </div>
      ) : (
        <div className="tasks-table">
          <div className="table-header" style={{
            gridTemplateColumns: '250px 150px 150px 120px 120px 120px'
          }}>
            <div>Property</div>
            <div>Buyer</div>
            <div>Seller</div>
            <div>Sale Price</div>
            <div>Your Earnings</div>
            <div>Close Date</div>
          </div>

          {filteredDeals.map((deal) => {
            return (
              <div
                key={deal.id}
                className="table-row"
                onClick={() => setSelectedDeal(deal)}
                style={{
                  gridTemplateColumns: '250px 150px 150px 120px 120px 120px',
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

                <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                  {formatCurrency(deal.purchasePrice)}
                </div>

                <div style={{ fontSize: '13px', color: '#ffaa00', fontWeight: '700' }}>
                  {formatCurrency(deal.commission?.agentEarnings)}
                </div>

                <div style={{ fontSize: '12px', color: '#888888' }}>
                  {formatDate(deal.actualCloseDate || deal.expectedCloseDate)}
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

export default ClosedDealsPage;
