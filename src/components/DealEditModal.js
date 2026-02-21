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

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ border: '2px solid #00ff88', padding: '30px', maxWidth: '700px' }}>
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '25px' }}>
          <h2 style={{
            fontSize: '20px',
            color: '#00ff88',
            margin: 0,
            fontWeight: '700'
          }}>
            Edit Deal
          </h2>
          <button
            onClick={onClose}
            className="icon-button"
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Deal Info */}
        <div className="card-surface" style={{ background: '#0f0f0f', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', color: '#666666', marginBottom: '8px' }}>
            Deal Parties
          </div>
          <div style={{ fontSize: '13px', color: '#ffffff', marginBottom: '4px' }}>
            <span style={{ color: '#0088ff' }}>Buyer:</span> {deal?.buyerName || 'N/A'}
          </div>
          <div style={{ fontSize: '13px', color: '#ffffff' }}>
            <span style={{ color: '#00ff88' }}>Seller:</span> {deal?.sellerName || 'N/A'}
          </div>
        </div>

        {error && (
          <div style={{
            background: '#ff333315',
            border: '1px solid #ff3333',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#ff3333'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Property Address */}
          <div className="form-field">
            <label>Property Address *</label>
            <input
              type="text"
              placeholder="123 Main St, Los Angeles, CA 90001"
              value={formData.propertyAddress}
              onChange={(e) => setFormData({...formData, propertyAddress: e.target.value})}
            />
          </div>

          {/* Status */}
          <div className="form-field">
            <label>Deal Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              {DEAL_STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Prices */}
          <div className="grid-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-field">
              <label>Purchase Price</label>
              <input
                type="number"
                placeholder="750000"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({...formData, purchasePrice: e.target.value})}
              />
            </div>
            <div className="form-field">
              <label>Offer Price</label>
              <input
                type="number"
                placeholder="735000"
                value={formData.offerPrice}
                onChange={(e) => setFormData({...formData, offerPrice: e.target.value})}
              />
            </div>
          </div>

          {/* Commission */}
          <div className="grid-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-field">
              <label>Commission %</label>
              <input
                type="number"
                step="0.1"
                placeholder="3.0"
                value={formData.commissionPercent}
                onChange={(e) => setFormData({...formData, commissionPercent: e.target.value})}
              />
            </div>
            <div className="form-field">
              <label>Your Split %</label>
              <input
                type="number"
                placeholder="50"
                value={formData.commissionSplit}
                onChange={(e) => setFormData({...formData, commissionSplit: e.target.value})}
              />
            </div>
          </div>

          {/* Commission Calculation */}
          {formData.purchasePrice && (
            <div className="card-surface" style={{ background: '#0f0f0f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#666666' }}>Total Commission</div>
                <div style={{ fontSize: '16px', color: '#ffaa00', fontWeight: '600' }}>
                  ${commission.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#666666' }}>Your Earnings</div>
                <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: '600' }}>
                  ${commission.earnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-field">
              <label>Contract Date</label>
              <input
                type="date"
                value={formData.contractDate}
                onChange={(e) => setFormData({...formData, contractDate: e.target.value})}
              />
            </div>
            <div className="form-field">
              <label>Expected Close Date</label>
              <input
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({...formData, expectedCloseDate: e.target.value})}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-field">
            <label>Notes</label>
            <textarea
              placeholder="Add notes about this deal..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealEditModal;
