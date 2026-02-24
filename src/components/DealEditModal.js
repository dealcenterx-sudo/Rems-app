import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// X icon for close button
const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const DEAL_STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'active-search', label: 'Active Search' },
  { value: 'offer-submitted', label: 'Offer Submitted' },
  { value: 'under-contract', label: 'Under Contract' },
  { value: 'pending-inspection', label: 'Pending Inspection' },
  { value: 'pending-financing', label: 'Pending Financing' },
  { value: 'pending-title', label: 'Pending Title' },
  { value: 'clear-to-close', label: 'Clear to Close' },
  { value: 'closed', label: 'Closed' },
  { value: 'dead', label: 'Dead' }
];

const DealEditModal = ({ deal, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    propertyAddress: '',
    status: 'lead',
    purchasePrice: '',
    offerPrice: '',
    commissionPercent: 3.0,
    commissionSplit: 50,
    expectedCloseDate: '',
    contractDate: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (deal) {
      setFormData({
        propertyAddress: deal.propertyAddress || '',
        status: deal.status || 'lead',
        purchasePrice: deal.purchasePrice || '',
        offerPrice: deal.offerPrice || '',
        commissionPercent: deal.commission?.percentage || 3.0,
        commissionSplit: deal.commission?.split || 50,
        expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.split('T')[0] : '',
        contractDate: deal.contractDate ? deal.contractDate.split('T')[0] : '',
        notes: deal.notes || ''
      });
    }
  }, [deal]);

  const handleSave = async () => {
    if (!formData.propertyAddress) {
      setError('Property address is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const previousStatus = deal?.status;
      const purchasePrice = parseFloat(formData.purchasePrice) || 0;
      const commissionPercent = parseFloat(formData.commissionPercent) || 0;
      const commissionAmount = purchasePrice * (commissionPercent / 100);
      const commissionSplit = parseFloat(formData.commissionSplit) || 0;
      const agentEarnings = commissionAmount * (commissionSplit / 100);

      const updateData = {
        propertyAddress: formData.propertyAddress,
        status: formData.status,
        purchasePrice: purchasePrice,
        offerPrice: parseFloat(formData.offerPrice) || 0,
        commission: {
          percentage: commissionPercent,
          amount: commissionAmount,
          split: commissionSplit,
          agentEarnings: agentEarnings
        },
        expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate).toISOString() : null,
        contractDate: formData.contractDate ? new Date(formData.contractDate).toISOString() : null,
        notes: formData.notes,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'deals', deal.id), updateData);

      if (formData.status === 'closed' && previousStatus !== 'closed' && deal?.sellerId) {
        try {
          await updateDoc(doc(db, 'contacts', deal.sellerId), {
            activelySelling: false,
            updatedAt: new Date().toISOString()
          });
        } catch (sellerUpdateError) {
          console.error('Failed to update seller activity status:', sellerUpdateError);
        }
      }
      
      if (onUpdate) {
        onUpdate();
      }
      
      onClose();
    } catch (err) {
      console.error('Error updating deal:', err);
      setError('Failed to update deal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateCommission = () => {
    const price = parseFloat(formData.purchasePrice) || 0;
    const percent = parseFloat(formData.commissionPercent) || 0;
    const split = parseFloat(formData.commissionSplit) || 0;
    const total = price * (percent / 100);
    const earnings = total * (split / 100);
    return { total, earnings };
  };

  const commission = calculateCommission();
  const currentStatusIndex = Math.max(0, DEAL_STATUSES.findIndex((status) => status.value === formData.status));
  const statusProgressPct = DEAL_STATUSES.length > 1
    ? (currentStatusIndex / (DEAL_STATUSES.length - 1)) * 100
    : 0;
  const quickActions = ['Call Buyer', 'Call Seller', 'Schedule Showing', 'Add Note'];

  return (
    <div className="modal-overlay">
      <div className="modal-content detail-modal-content">
        <div className="detail-layout-topbar">
          <div className="detail-layout-title-wrap">
            <h2 className="detail-layout-title">Edit Deal</h2>
            <div className="detail-layout-pills">
              <span className="detail-layout-pill">Buyer: {deal?.buyerName || 'N/A'}</span>
              <span className="detail-layout-pill">Seller: {deal?.sellerName || 'N/A'}</span>
            </div>
          </div>
          <div className="detail-layout-actions">
            <button type="button" className="lead-action-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="lead-action-btn lead-action-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="icon-button" onClick={onClose}>
              <XIcon size={22} />
            </button>
          </div>
        </div>

        <div className="detail-layout-stage-card">
          <div className="detail-layout-stage-row">
            {DEAL_STATUSES.map((status, index) => {
              const isActive = status.value === formData.status;
              const isComplete = index <= currentStatusIndex;
              return (
                <button
                  key={status.value}
                  type="button"
                  className={`detail-stage-chip ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                  onClick={() => setFormData({ ...formData, status: status.value })}
                >
                  {status.label}
                </button>
              );
            })}
          </div>
          <div className="detail-stage-progress">
            <div className="detail-stage-progress-fill" style={{ width: `${statusProgressPct}%` }} />
          </div>
        </div>

        {error && (
          <div className="detail-error-banner">
            {error}
          </div>
        )}

        <div className="detail-layout-grid">
          <aside className="detail-layout-sidebar">
            <div className="lead-panel-card">
              <div className="lead-panel-title">Core Details</div>
              <div className="lead-field-stack">
                <div className="lead-field">
                  <label>Property Address *</label>
                  <input
                    type="text"
                    placeholder="123 Main St, Los Angeles, CA 90001"
                    value={formData.propertyAddress}
                    onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                  />
                </div>
                <div className="lead-field">
                  <label>Contract Date</label>
                  <input
                    type="date"
                    value={formData.contractDate}
                    onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
                  />
                </div>
                <div className="lead-field">
                  <label>Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </aside>

          <section className="detail-layout-main">
            <div className="lead-panel-card">
              <div className="lead-engagement-actions">
                {quickActions.map((label) => (
                  <button key={label} type="button" className="lead-engagement-btn">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lead-panel-card">
              <div className="lead-panel-title">Financials</div>
              <div className="grid-two" style={{ display: 'grid', gap: '12px' }}>
                <div className="lead-field">
                  <label>Purchase Price</label>
                  <input
                    type="number"
                    placeholder="750000"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  />
                </div>
                <div className="lead-field">
                  <label>Offer Price</label>
                  <input
                    type="number"
                    placeholder="735000"
                    value={formData.offerPrice}
                    onChange={(e) => setFormData({ ...formData, offerPrice: e.target.value })}
                  />
                </div>
                <div className="lead-field">
                  <label>Commission %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.commissionPercent}
                    onChange={(e) => setFormData({ ...formData, commissionPercent: e.target.value })}
                  />
                </div>
                <div className="lead-field">
                  <label>Your Split %</label>
                  <input
                    type="number"
                    value={formData.commissionSplit}
                    onChange={(e) => setFormData({ ...formData, commissionSplit: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="lead-panel-card">
              <div className="lead-panel-title">Notes</div>
              <div className="lead-field">
                <textarea
                  placeholder="Add notes about this deal..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={5}
                />
              </div>
            </div>
          </section>

          <aside className="detail-layout-aside">
            <div className="lead-panel-card">
              <div className="lead-panel-title">Commission Snapshot</div>
              <div className="lead-metrics-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="lead-metric">
                  <span className="lead-metric-label">Total Commission</span>
                  <span className="lead-metric-value">
                    ${commission.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="lead-metric">
                  <span className="lead-metric-label">Your Earnings</span>
                  <span className="lead-metric-value">
                    ${commission.earnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="lead-metric">
                  <span className="lead-metric-label">Current Status</span>
                  <span className="lead-metric-value">
                    {DEAL_STATUSES.find((status) => status.value === formData.status)?.label || 'Lead'}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default DealEditModal;
