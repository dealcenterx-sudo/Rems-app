import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useUserDoc from '../utils/useUserDoc';

const DealPortalPage = React.lazy(() => import('./DealPortalPage'));

const STATUS_COLORS = {
  new: '#ffaa00',
  active: '#00ff88',
  pending: '#0088ff',
  closed: '#aa00ff'
};

// Client-facing deals list for buyers/sellers: shows deals assigned via
// users/{uid}.assignedDeals and opens the shared deal portal.
const MyDealsPage = () => {
  const { userDoc } = useUserDoc();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portalDealId, setPortalDealId] = useState(null);

  useEffect(() => {
    const assignedIds = Array.isArray(userDoc?.assignedDeals) ? userDoc.assignedDeals : [];
    if (!userDoc) return;
    if (assignedIds.length === 0) {
      setDeals([]);
      setLoading(false);
      return;
    }

    const loadDeals = async () => {
      try {
        const snapshots = await Promise.all(
          assignedIds.map((id) => getDoc(doc(db, 'deals', id)).catch(() => null))
        );
        setDeals(
          snapshots
            .filter((snap) => snap?.exists())
            .map((snap) => ({ id: snap.id, ...snap.data() }))
        );
      } catch (error) {
        console.error('Error loading assigned deals:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDeals();
  }, [userDoc]);

  if (portalDealId) {
    return (
      <React.Suspense fallback={<div className="loading-container"><div className="loading-spinner" /></div>}>
        <DealPortalPage dealId={portalDealId} onBack={() => setPortalDealId(null)} />
      </React.Suspense>
    );
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container"><div className="loading-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', color: '#ffffff', fontWeight: '700', margin: '0 0 4px 0' }}>
          Your Deals
        </h2>
        <p style={{ fontSize: '13px', color: '#888888', margin: 0 }}>
          Transactions your agent has shared with you
        </p>
      </div>

      {deals.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">🤝</div>
          <div className="empty-state-title">No deals shared yet</div>
          <div className="empty-state-subtitle">
            When your agent adds you to a transaction, it appears here with documents, progress, and chat.
          </div>
        </div>
      ) : (
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {deals.map((deal) => {
            const statusColor = STATUS_COLORS[deal.status] || '#888888';
            return (
              <div
                key={deal.id}
                className="card-surface hover-lift"
                role="button"
                tabIndex={0}
                onClick={() => setPortalDealId(deal.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPortalDealId(deal.id);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#ffffff' }}>
                    {deal.propertyAddress || 'Untitled Deal'}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: statusColor,
                    background: `${statusColor}15`,
                    padding: '4px 10px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap'
                  }}>
                    {deal.status || 'new'}
                  </span>
                </div>
                {deal.purchasePrice ? (
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#00ff88', marginBottom: '8px' }}>
                    ${Number(deal.purchasePrice).toLocaleString()}
                  </div>
                ) : null}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Open portal for documents, progress, and chat →
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyDealsPage;
