import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
import DealEditModal from './DealEditModal';
import { isAdminUser } from '../utils/helpers';

const CLOSED_DEALS_PAGE_SIZE = 30;

const ClosedDealsPage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState([null]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const pageCursorsRef = useRef(pageCursors);

  useEffect(() => {
    pageCursorsRef.current = pageCursors;
  }, [pageCursors]);

  const loadDeals = useCallback(async (targetPage = 0, forceReset = false) => {
    const sanitizedPage = Math.max(0, Number(targetPage) || 0);
    try {
      const isAdmin = isAdminUser();

      const constraints = [collection(db, 'deals')];
      if (!isAdmin) {
        constraints.push(where('userId', '==', auth.currentUser.uid));
      }

      constraints.push(where('status', '==', 'closed'), orderBy('createdAt', 'desc'), limit(CLOSED_DEALS_PAGE_SIZE + 1));

      const cursor = forceReset ? null : pageCursorsRef.current[sanitizedPage];
      if (cursor) {
        constraints.push(startAfter(cursor));
      }

      const querySnapshot = await getDocs(query(...constraints));
      const dealsData = [];

      querySnapshot.docs.slice(0, CLOSED_DEALS_PAGE_SIZE).forEach((doc) => {
        const data = doc.data();
        dealsData.push({
          id: doc.id,
          ...data
        });
      });

      const nextCursor = querySnapshot.docs.length > CLOSED_DEALS_PAGE_SIZE
        ? querySnapshot.docs[CLOSED_DEALS_PAGE_SIZE - 1]
        : null;
      setHasNextPage(Boolean(nextCursor));
      setPageCursors((prev) => {
        const next = [...prev];
        next[sanitizedPage + 1] = nextCursor;
        if (next.length > sanitizedPage + 2) {
          next.splice(sanitizedPage + 2);
        }
        return next;
      });
      if (forceReset) {
        setPageIndex(0);
      } else {
        setPageIndex(sanitizedPage);
      }

      setDeals(dealsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading deals:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals(0, true);
  }, [loadDeals]);

  const filteredDeals = useMemo(() => {
    if (!searchQuery) return deals;
    const query = searchQuery.toLowerCase();
    return deals.filter(deal =>
      deal.propertyAddress?.toLowerCase().includes(query) ||
      deal.buyerName?.toLowerCase().includes(query) ||
      deal.sellerName?.toLowerCase().includes(query)
    );
  }, [deals, searchQuery]);

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

  const handleNextPage = () => {
    if (!hasNextPage) return;
    loadDeals(pageIndex + 1);
  };

  const handlePrevPage = () => {
    if (pageIndex === 0) return;
    loadDeals(pageIndex - 1);
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
      {/* Header with Stats */}
      <div style={{ marginBottom: '25px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: '0 0 20px 0' }}>
          Closed Deals
        </h2>

        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div className="card-surface hover-lift">
            <div style={{ fontSize: '11px', color: '#666666', marginBottom: '8px', textTransform: 'uppercase' }}>
              Total Closed
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#00ff88' }}>
              {filteredDeals.length}
            </div>
          </div>

          <div className="card-surface hover-lift">
            <div style={{ fontSize: '11px', color: '#666666', marginBottom: '8px', textTransform: 'uppercase' }}>
              Total Volume
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#0088ff' }}>
              {formatCurrency(totalVolume)}
            </div>
          </div>

          <div className="card-surface hover-lift">
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
      <div className="card-surface" style={{ marginBottom: '20px' }}>
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
        <div className="empty-state-card">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">
            {deals.length === 0 ? 'No closed deals yet' : 'No closed deals match your search'}
          </div>
          <div className="empty-state-subtitle">
            {deals.length === 0 ? 'Keep working those active deals.' : 'Try a different property, buyer, or seller.'}
          </div>
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
                <div data-label="Property" style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                  {deal.propertyAddress || 'No address'}
                </div>

                <div data-label="Buyer" style={{ fontSize: '12px', color: '#0088ff' }}>
                  {deal.buyerName || 'N/A'}
                </div>

                <div data-label="Seller" style={{ fontSize: '12px', color: '#00ff88' }}>
                  {deal.sellerName || 'N/A'}
                </div>

                <div data-label="Sale Price" style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                  {formatCurrency(deal.purchasePrice)}
                </div>

                <div data-label="Your Earnings" style={{ fontSize: '13px', color: '#ffaa00', fontWeight: '700' }}>
                  {formatCurrency(deal.commission?.agentEarnings)}
                </div>

              <div data-label="Close Date" style={{ fontSize: '12px', color: '#888888' }}>
                  {formatDate(deal.actualCloseDate || deal.expectedCloseDate)}
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#888888' }}>
              Showing {filteredDeals.length} closed deal{filteredDeals.length === 1 ? '' : 's'} on this page
              {hasNextPage ? ' · more available' : ''}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handlePrevPage} disabled={pageIndex === 0} className="btn-secondary btn-sm">
                ← Previous
              </button>
              <button onClick={handleNextPage} disabled={!hasNextPage} className="btn-primary btn-sm">
                Next →
              </button>
            </div>
          </div>
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
