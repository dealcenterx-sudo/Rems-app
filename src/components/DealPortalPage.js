import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertCircle, Users, FileText, BarChart, Mail, CheckSquare, isExternalRole } from './Icons';
import { LoadingOverlay } from './Loading';
import PageState from './PageState';
import useUserDoc from '../utils/useUserDoc';

const DealPartiesTab = React.lazy(() => import('./DealPartiesTab'));
const DealChatTab = React.lazy(() => import('./DealChatTab'));
const DealFinancialsTab = React.lazy(() => import('./DealFinancialsTab'));
const DealDocumentsTab = React.lazy(() => import('./DealDocumentsTab'));
const DealProgressTab = React.lazy(() => import('./DealProgressTab'));

const PORTAL_TABS = [
  { id: 'parties', label: 'Parties', icon: Users },
  { id: 'chat', label: 'Chat', icon: Mail },
  { id: 'financials', label: 'Financials', icon: BarChart },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'progress', label: 'Progress', icon: CheckSquare }
];

const DealPortalPage = ({ dealId, onBack }) => {
  const { userDoc } = useUserDoc();
  const [activeTab, setActiveTab] = useState('parties');
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Financials holds agent tooling (commission, lender pushes) — internal only.
  const portalTabs = isExternalRole(userDoc?.role)
    ? PORTAL_TABS.filter((tab) => tab.id !== 'financials')
    : PORTAL_TABS;

  useEffect(() => {
    if (!dealId) return;
    const loadDeal = async () => {
      try {
        setLoadError('');
        const snap = await getDoc(doc(db, 'deals', dealId));
        if (snap.exists()) {
          setDeal({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error('Error loading deal:', err);
        setLoadError('Could not load this deal. Go back to the deals list and try again.');
      }
      setLoading(false);
    };
    loadDeal();
  }, [dealId]);

  if (loading) {
    return (
      <div className="page-content">
        <LoadingOverlay message="Loading deal portal" />
      </div>
    );
  }

  if (!dealId) {
    return (
      <div className="page-content">
        <PageState
          icon={Users}
          eyebrow="Deal portal"
          title="No deal selected"
          message="Select a deal from Active Deals to open the collaborative portal."
          actions={<button onClick={onBack} className="btn-primary">Go to active deals</button>}
        />
      </div>
    );
  }

  if (loadError || !deal) {
    return (
      <div className="page-content">
        <PageState
          tone={loadError ? 'error' : 'warning'}
          icon={AlertCircle}
          eyebrow="Deal portal"
          title={loadError ? 'Could not load this deal' : 'Deal not found'}
          message={loadError || 'This deal may have been deleted or is no longer assigned to you.'}
          actions={<button onClick={onBack} className="btn-primary">Back to deals</button>}
        />
      </div>
    );
  }

  return (
    <div className="page-content" style={{ padding: 0 }}>
      {/* Portal Header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: '1px solid #333', color: '#888', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            ← Back
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>
              {deal.propertyAddress || 'Untitled Deal'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '4px' }}>
              {deal.buyerName || 'No Buyer'} • {deal.sellerName || 'No Seller'}
              {deal.purchasePrice ? ` • $${Number(deal.purchasePrice).toLocaleString()}` : ''}
            </div>
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: '700',
            color: deal.status === 'active' ? '#00ff88' : deal.status === 'pending' ? '#0088ff' : deal.status === 'closed' ? '#aa00ff' : '#ffaa00',
            background: `${deal.status === 'active' ? '#00ff88' : deal.status === 'pending' ? '#0088ff' : deal.status === 'closed' ? '#aa00ff' : '#ffaa00'}15`,
            padding: '4px 12px',
            borderRadius: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {deal.status || 'new'}
          </span>
        </div>

        {/* Tab bar */}
        <div role="tablist" aria-label="Deal portal sections" style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
          {portalTabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`deal-portal-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #00ff88' : '2px solid transparent',
                color: activeTab === tab.id ? '#00ff88' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={16} color={activeTab === tab.id ? '#00ff88' : '#8a8a8a'} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div
        id={`deal-portal-panel-${activeTab}`}
        role="tabpanel"
        aria-label={`${portalTabs.find((tab) => tab.id === activeTab)?.label || 'Deal'} panel`}
        style={{ padding: '24px', overflowY: 'auto', flex: 1 }}
      >
        <React.Suspense fallback={<LoadingOverlay message="Loading portal section" />}>
          {activeTab === 'parties' && <DealPartiesTab dealId={dealId} deal={deal} />}
          {activeTab === 'chat' && <DealChatTab dealId={dealId} deal={deal} />}
          {activeTab === 'financials' && !isExternalRole(userDoc?.role) && (
            <DealFinancialsTab dealId={dealId} deal={deal} onDealUpdate={setDeal} />
          )}
          {activeTab === 'documents' && <DealDocumentsTab dealId={dealId} deal={deal} />}
          {activeTab === 'progress' && <DealProgressTab dealId={dealId} deal={deal} />}
        </React.Suspense>
      </div>
    </div>
  );
};

export default DealPortalPage;
