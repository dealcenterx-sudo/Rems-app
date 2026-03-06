import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from './Toast';

const FIELD_STYLE = { background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' };
const LABEL_STYLE = { fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' };

const DealFinancialsTab = ({ dealId, deal, onDealUpdate }) => {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushingToLender, setPushingToLender] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  const [lenderParties, setLenderParties] = useState([]);
  const [selectedLender, setSelectedLender] = useState('');
  const [pushNote, setPushNote] = useState('');

  const [form, setForm] = useState({
    purchasePrice: deal?.purchasePrice || '',
    offerPrice: deal?.offerPrice || '',
    earnestMoney: deal?.earnestMoney || '',
    downPayment: deal?.downPayment || '',
    loanAmount: deal?.loanAmount || '',
    interestRate: deal?.interestRate || '',
    loanType: deal?.loanType || 'conventional',
    closingCosts: deal?.closingCosts || '',
    buyerAgentCommission: deal?.buyerAgentCommission || '3',
    sellerAgentCommission: deal?.sellerAgentCommission || '3',
    titleFees: deal?.titleFees || '',
    inspectionFee: deal?.inspectionFee || '',
    appraisalFee: deal?.appraisalFee || '',
    attorneyFees: deal?.attorneyFees || '',
    homeWarranty: deal?.homeWarranty || '',
    proRatedTaxes: deal?.proRatedTaxes || '',
    otherFees: deal?.otherFees || '',
    otherFeesDescription: deal?.otherFeesDescription || ''
  });

  useEffect(() => {
    loadLenderParties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const loadLenderParties = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'deal-parties'), where('dealId', '==', dealId), where('role', '==', 'lender')));
      const data = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
      setLenderParties(data);
    } catch (err) {
      console.error('Error loading lenders:', err);
    }
  };

  const num = (v) => {
    const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const fmt = (v) => {
    const n = num(v);
    return n ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '—';
  };

  const pct = (v) => (num(v) ? `${num(v)}%` : '—');

  const purchasePrice = num(form.purchasePrice);
  const buyerCommAmt = purchasePrice * (num(form.buyerAgentCommission) / 100);
  const sellerCommAmt = purchasePrice * (num(form.sellerAgentCommission) / 100);
  const totalCommissions = buyerCommAmt + sellerCommAmt;
  const totalFees = num(form.titleFees) + num(form.inspectionFee) + num(form.appraisalFee) + num(form.attorneyFees) + num(form.homeWarranty) + num(form.proRatedTaxes) + num(form.otherFees) + num(form.closingCosts);
  const netToSeller = purchasePrice - sellerCommAmt - (num(form.titleFees) / 2) - num(form.proRatedTaxes);

  const saveFinancials = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'deals', dealId), {
        ...form,
        updatedAt: new Date().toISOString()
      });
      onDealUpdate?.({ ...deal, ...form });
      toast.success('Financials updated');
      setEditing(false);
    } catch (err) {
      console.error('Error saving financials:', err);
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  const pushToLender = async () => {
    if (!selectedLender) {
      toast.error('Select a lender');
      return;
    }
    setPushingToLender(true);
    try {
      const lender = lenderParties.find((l) => l.id === selectedLender);
      await addDoc(collection(db, 'deal-lender-pushes'), {
        dealId,
        lenderId: selectedLender,
        lenderName: lender?.name || '',
        lenderEmail: lender?.email || '',
        financials: form,
        propertyAddress: deal?.propertyAddress || '',
        buyerName: deal?.buyerName || '',
        sellerName: deal?.sellerName || '',
        note: pushNote,
        status: 'pending',
        pushedBy: auth.currentUser?.uid || null,
        pushedByEmail: auth.currentUser?.email || null,
        createdAt: new Date().toISOString()
      });
      toast.success(`Deal pushed to ${lender?.name || 'lender'} for approval`);
      setShowPushModal(false);
      setPushNote('');
    } catch (err) {
      console.error('Error pushing to lender:', err);
      toast.error('Failed to push to lender');
    }
    setPushingToLender(false);
  };

  const renderField = (label, key, opts = {}) => {
    const { prefix = '', suffix = '', type = 'text' } = opts;
    return (
      <div>
        <label style={LABEL_STYLE}>{label}</label>
        {editing ? (
          <div style={{ position: 'relative' }}>
            {prefix && <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '14px' }}>{prefix}</span>}
            <input
              type={type}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              style={{ ...FIELD_STYLE, paddingLeft: prefix ? '24px' : '12px' }}
            />
            {suffix && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '12px' }}>{suffix}</span>}
          </div>
        ) : (
          <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600' }}>
            {prefix === '$' ? fmt(form[key]) : suffix === '%' ? pct(form[key]) : (form[key] || '—')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>Deal Financials</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>All numbers visible to authorized parties</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!editing ? (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: '8px 16px' }}>Edit</button>
              <button
                onClick={() => setShowPushModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 16px', background: '#aa00ff', color: '#fff',
                  border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                }}
              >
                🏦 Push to Lender
              </button>
            </>
          ) : (
            <>
              <button onClick={saveFinancials} disabled={saving} className="btn-primary" style={{ padding: '8px 16px' }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        {[
          { label: 'Purchase Price', value: fmt(form.purchasePrice), color: '#00ff88' },
          { label: 'Total Commissions', value: fmt(totalCommissions), color: '#0088ff' },
          { label: 'Total Fees & Costs', value: fmt(totalFees), color: '#ff8800' },
          { label: 'Est. Net to Seller', value: fmt(netToSeller), color: '#aa00ff' }
        ].map((card) => (
          <div key={card.label} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Price & Offer */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>Price & Terms</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          {renderField('Purchase Price', 'purchasePrice', { prefix: '$' })}
          {renderField('Offer Price', 'offerPrice', { prefix: '$' })}
          {renderField('Earnest Money', 'earnestMoney', { prefix: '$' })}
        </div>
      </div>

      {/* Financing */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>Financing</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px' }}>
          {renderField('Down Payment', 'downPayment', { prefix: '$' })}
          {renderField('Loan Amount', 'loanAmount', { prefix: '$' })}
          {renderField('Interest Rate', 'interestRate', { suffix: '%' })}
          <div>
            <label style={LABEL_STYLE}>Loan Type</label>
            {editing ? (
              <select
                value={form.loanType}
                onChange={(e) => setForm({ ...form, loanType: e.target.value })}
                style={FIELD_STYLE}
              >
                <option value="conventional">Conventional</option>
                <option value="fha">FHA</option>
                <option value="va">VA</option>
                <option value="usda">USDA</option>
                <option value="jumbo">Jumbo</option>
                <option value="cash">Cash</option>
                <option value="hard-money">Hard Money</option>
                <option value="other">Other</option>
              </select>
            ) : (
              <div style={{ fontSize: '16px', color: '#fff', fontWeight: '600', textTransform: 'capitalize' }}>{form.loanType?.replace(/-/g, ' ') || '—'}</div>
            )}
          </div>
        </div>
      </div>

      {/* Commissions */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>Commissions</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px' }}>
          {renderField("Buyer's Agent %", 'buyerAgentCommission', { suffix: '%' })}
          <div>
            <label style={LABEL_STYLE}>Buyer Agent Amount</label>
            <div style={{ fontSize: '16px', color: '#0088ff', fontWeight: '600' }}>{fmt(buyerCommAmt)}</div>
          </div>
          {renderField("Seller's Agent %", 'sellerAgentCommission', { suffix: '%' })}
          <div>
            <label style={LABEL_STYLE}>Seller Agent Amount</label>
            <div style={{ fontSize: '16px', color: '#00ff88', fontWeight: '600' }}>{fmt(sellerCommAmt)}</div>
          </div>
        </div>
      </div>

      {/* Fees */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>Fees & Costs</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
          {renderField('Closing Costs', 'closingCosts', { prefix: '$' })}
          {renderField('Title Fees', 'titleFees', { prefix: '$' })}
          {renderField('Inspection Fee', 'inspectionFee', { prefix: '$' })}
          {renderField('Appraisal Fee', 'appraisalFee', { prefix: '$' })}
          {renderField('Attorney Fees', 'attorneyFees', { prefix: '$' })}
          {renderField('Home Warranty', 'homeWarranty', { prefix: '$' })}
          {renderField('Pro-Rated Taxes', 'proRatedTaxes', { prefix: '$' })}
          {renderField('Other Fees', 'otherFees', { prefix: '$' })}
          {renderField('Other Description', 'otherFeesDescription')}
        </div>
      </div>

      {/* Push to Lender Modal */}
      {showPushModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', padding: '30px' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', color: '#fff', fontWeight: '600' }}>Push Deal to Lender</h2>
              <button onClick={() => setShowPushModal(false)} className="icon-button">×</button>
            </div>

            <div style={{ background: '#0a0a0a', borderRadius: '6px', padding: '14px', marginBottom: '20px', border: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.5' }}>
                This will package the deal financials, property details, and buyer information and push it to the selected lender's portal for loan approval. The lender will receive an email with all conditional documents.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={LABEL_STYLE}>Select Lender *</label>
                {lenderParties.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#ff4444' }}>No lenders added to this deal. Add a lender in the Parties tab first.</div>
                ) : (
                  <select
                    value={selectedLender}
                    onChange={(e) => setSelectedLender(e.target.value)}
                    style={FIELD_STYLE}
                  >
                    <option value="">Choose a lender...</option>
                    {lenderParties.map((l) => (
                      <option key={l.id} value={l.id}>{l.name} — {l.company || l.email}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label style={LABEL_STYLE}>Note to Lender</label>
                <textarea
                  value={pushNote}
                  onChange={(e) => setPushNote(e.target.value)}
                  placeholder="Any additional notes for the lender..."
                  rows={3}
                  style={{ ...FIELD_STYLE, resize: 'vertical' }}
                />
              </div>

              {/* Package Summary */}
              <div style={{ background: '#111', borderRadius: '6px', padding: '14px', border: '1px solid #1a1a1a' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px', fontWeight: '600' }}>Package Contents:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#aaa' }}>
                  <div>• Purchase Price: {fmt(form.purchasePrice)}</div>
                  <div>• Down Payment: {fmt(form.downPayment)}</div>
                  <div>• Loan Amount: {fmt(form.loanAmount)}</div>
                  <div>• Loan Type: {form.loanType?.replace(/-/g, ' ')}</div>
                  <div>• Property: {deal?.propertyAddress || 'N/A'}</div>
                  <div>• Buyer: {deal?.buyerName || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1a1a1a' }}>
              <button
                onClick={pushToLender}
                disabled={pushingToLender || !selectedLender}
                style={{
                  flex: 1, padding: '10px', background: '#aa00ff', color: '#fff',
                  border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                  opacity: (!selectedLender || pushingToLender) ? 0.5 : 1
                }}
              >
                {pushingToLender ? 'Pushing...' : '🏦 Push to Lender Portal'}
              </button>
              <button onClick={() => setShowPushModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealFinancialsTab;
