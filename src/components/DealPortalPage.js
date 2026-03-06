import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import DealPartiesTab from './DealPartiesTab';
import DealChatTab from './DealChatTab';
import DealFinancialsTab from './DealFinancialsTab';
import DealDocumentsTab from './DealDocumentsTab';
import DealProgressTab from './DealProgressTab';
import { Users, FileText, BarChart, Mail, CheckSquare } from './Icons';

const PORTAL_TABS = [
  { id: 'parties', label: 'Parties', icon: Users },
  { id: 'chat', label: 'Chat', icon: Mail },
  { id: 'financials', label: 'Financials', icon: BarChart },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'progress', label: 'Progress', icon: CheckSquare }
];

const DealPortalPage = ({ dealId, onBack }) => {
  const [activeTab, setActiveTab] = useState('parties');
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealId) return;
    const loadDeal = async () => {
      try {
        const snap = await getDoc(doc(db, 'deals', dealId));
        if (snap.exists()) {
          setDeal({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error('Error loading deal:', err);
      }
      setLoading(false);
    };
    loadDeal();
  }, [dealId]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container"><div className="loading-spinner" /></div>
      </div>
    );
  }

  if (!dealId) {
    return (
      <div className="page-content">
        <div className="empty-state-card">
          <div className="empty-state-icon">🤝</div>
          <div className="empty-state-title">No Deal Selected</div>
          <div className="empty-state-subtitle">Select a deal from Active Deals to open the collaborative portal</div>
          <button onClick={onBack} className="btn-primary" style={{ marginTop: '16px' }}>Go to Active Deals</button>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="page-content">
        <div className="empty-state-card">
          <div className="empty-state-icon">🚫</div>
          <div className="empty-state-title">Deal not found</div>
          <button onClick={onBack} className="btn-primary" style={{ marginTop: '16px' }}>Back to Deals</button>
        </div>
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
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
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
        <div style={{ display: 'flex', gap: '0', overflowX: 'auto' }}>
          {PORTAL_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #00ff88' : '2px solid transparent',
                color: activeTab === tab.id ? '#00ff88' : '#666',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={16} color={activeTab === tab.id ? '#00ff88' : '#666'} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
        {activeTab === 'parties' && <DealPartiesTab dealId={dealId} deal={deal} />}
        {activeTab === 'chat' && <DealChatTab dealId={dealId} deal={deal} />}
        {activeTab === 'financials' && <DealFinancialsTab dealId={dealId} deal={deal} onDealUpdate={setDeal} />}
        {activeTab === 'documents' && <DealDocumentsTab dealId={dealId} deal={deal} />}
        {activeTab === 'progress' && <DealProgressTab dealId={dealId} deal={deal} />}
      </div>
    </div>
  );
};

export default DealPortalPage;
