import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from './Toast';
import { Plus } from './Icons';

const DEFAULT_CHECKLIST = [
  { phase: 'Pre-Contract', items: [
    { key: 'offer-submitted', label: 'Offer Submitted', description: 'Purchase offer sent to seller' },
    { key: 'offer-accepted', label: 'Offer Accepted', description: 'Seller accepted the offer' },
    { key: 'earnest-money', label: 'Earnest Money Deposited', description: 'Earnest money deposit received by escrow' },
    { key: 'contract-signed', label: 'Contract Fully Executed', description: 'All parties have signed the purchase agreement' }
  ]},
  { phase: 'Due Diligence', items: [
    { key: 'inspection-ordered', label: 'Inspection Ordered', description: 'Home inspection scheduled' },
    { key: 'inspection-complete', label: 'Inspection Complete', description: 'Inspection report received and reviewed' },
    { key: 'appraisal-ordered', label: 'Appraisal Ordered', description: 'Lender ordered the appraisal' },
    { key: 'appraisal-complete', label: 'Appraisal Complete', description: 'Property appraised at or above purchase price' },
    { key: 'survey-complete', label: 'Survey Complete', description: 'Property survey completed (if applicable)' }
  ]},
  { phase: 'Financing', items: [
    { key: 'loan-application', label: 'Loan Application Submitted', description: 'Buyer submitted mortgage application' },
    { key: 'loan-preapproval', label: 'Pre-Approval Received', description: 'Lender issued pre-approval letter' },
    { key: 'conditions-submitted', label: 'Conditions Submitted', description: 'All lender conditions sent' },
    { key: 'underwriting-complete', label: 'Underwriting Complete', description: 'Loan cleared underwriting' },
    { key: 'clear-to-close', label: 'Clear to Close', description: 'Lender issued clear to close' }
  ]},
  { phase: 'Title & Legal', items: [
    { key: 'title-search', label: 'Title Search Complete', description: 'Title company completed title search' },
    { key: 'title-insurance', label: 'Title Insurance Ordered', description: 'Title insurance commitment issued' },
    { key: 'title-clear', label: 'Title Clear', description: 'No liens or encumbrances found' },
    { key: 'attorney-review', label: 'Attorney Review Complete', description: 'Attorneys have reviewed all documents' },
    { key: 'hoa-docs', label: 'HOA Documents Received', description: 'HOA estoppel / docs received (if applicable)' }
  ]},
  { phase: 'Pre-Closing', items: [
    { key: 'closing-disclosure', label: 'Closing Disclosure Sent', description: 'CD sent to buyer (3-day waiting period)' },
    { key: 'final-walkthrough', label: 'Final Walk-Through', description: 'Buyer completed final property walkthrough' },
    { key: 'wire-instructions', label: 'Wire Instructions Sent', description: 'Closing agent sent wire transfer details' },
    { key: 'funds-wired', label: 'Funds Wired', description: 'Buyer wired closing funds' }
  ]},
  { phase: 'Closing', items: [
    { key: 'closing-scheduled', label: 'Closing Scheduled', description: 'Date and location confirmed for closing' },
    { key: 'docs-signed', label: 'Closing Documents Signed', description: 'All closing documents executed' },
    { key: 'recorded', label: 'Deed Recorded', description: 'Deed recorded with county' },
    { key: 'keys-delivered', label: 'Keys Delivered', description: 'Keys handed over to buyer — Deal closed!' }
  ]}
];

const DealProgressTab = ({ dealId, deal }) => {
  const toast = useToast();
  const [checklist, setChecklist] = useState({});
  const [loading, setLoading] = useState(true);
  const [customItems, setCustomItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ label: '', phase: 'Pre-Contract', description: '' });

  useEffect(() => {
    loadChecklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const loadChecklist = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'deal-progress'), where('dealId', '==', dealId)));
      const data = {};
      const custom = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data() };
        if (item.isCustom) {
          custom.push(item);
        } else {
          data[item.key] = item;
        }
      });
      setChecklist(data);
      setCustomItems(custom);
    } catch (err) {
      console.error('Error loading progress:', err);
    }
    setLoading(false);
  };

  const toggleItem = async (key, label) => {
    const existing = checklist[key];
    try {
      if (existing) {
        const newCompleted = !existing.completed;
        await updateDoc(doc(db, 'deal-progress', existing.id), {
          completed: newCompleted,
          completedAt: newCompleted ? new Date().toISOString() : null,
          completedBy: newCompleted ? (auth.currentUser?.email || null) : null,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'deal-progress'), {
          dealId,
          key,
          label,
          completed: true,
          isCustom: false,
          completedAt: new Date().toISOString(),
          completedBy: auth.currentUser?.email || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      loadChecklist();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const toggleCustomItem = async (item) => {
    try {
      const newCompleted = !item.completed;
      await updateDoc(doc(db, 'deal-progress', item.id), {
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : null,
        completedBy: newCompleted ? (auth.currentUser?.email || null) : null
      });
      loadChecklist();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const addCustomItem = async () => {
    if (!newItemForm.label) {
      toast.error('Label is required');
      return;
    }
    try {
      const key = `custom-${Date.now()}`;
      await addDoc(collection(db, 'deal-progress'), {
        dealId,
        key,
        label: newItemForm.label,
        description: newItemForm.description,
        phase: newItemForm.phase,
        completed: false,
        isCustom: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success('Checklist item added');
      setNewItemForm({ label: '', phase: 'Pre-Contract', description: '' });
      setShowAddItem(false);
      loadChecklist();
    } catch (err) {
      toast.error('Failed to add item');
    }
  };

  // Calculate progress
  const totalDefaultItems = DEFAULT_CHECKLIST.reduce((sum, phase) => sum + phase.items.length, 0);
  const completedDefaultItems = DEFAULT_CHECKLIST.reduce((sum, phase) =>
    sum + phase.items.filter((item) => checklist[item.key]?.completed).length, 0);
  const completedCustomItems = customItems.filter((i) => i.completed).length;
  const totalItems = totalDefaultItems + customItems.length;
  const completedItems = completedDefaultItems + completedCustomItems;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner" /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>Deal Progress</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Track every step from offer to closing</div>
        </div>
        <button
          onClick={() => setShowAddItem(true)}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
        >
          <Plus size={14} color="#888" /> Add Custom Step
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>Overall Progress</span>
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#00ff88' }}>{progressPct}%</span>
        </div>
        <div style={{ height: '8px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: progressPct === 100 ? '#00ff88' : progressPct > 60 ? '#00cc66' : progressPct > 30 ? '#ffaa00' : '#ff4444',
            borderRadius: '4px',
            transition: 'width 0.5s ease'
          }} />
        </div>
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          {completedItems} of {totalItems} steps completed
        </div>
      </div>

      {/* Phase Sections */}
      {DEFAULT_CHECKLIST.map((phase) => {
        const phaseCompleted = phase.items.filter((item) => checklist[item.key]?.completed).length;
        const phaseCustom = customItems.filter((i) => i.phase === phase.phase);
        const allPhaseItems = phase.items.length + phaseCustom.length;
        const allPhaseCompleted = phaseCompleted + phaseCustom.filter((i) => i.completed).length;

        return (
          <div key={phase.phase} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden' }}>
            {/* Phase Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: allPhaseCompleted === allPhaseItems && allPhaseItems > 0 ? '#00ff88' : '#fff' }}>
                  {phase.phase}
                </span>
                {allPhaseCompleted === allPhaseItems && allPhaseItems > 0 && (
                  <span style={{ fontSize: '12px' }}>✅</span>
                )}
              </div>
              <span style={{ fontSize: '11px', color: '#666' }}>{allPhaseCompleted}/{allPhaseItems}</span>
            </div>

            {/* Items */}
            {phase.items.map((item) => {
              const state = checklist[item.key];
              const isCompleted = state?.completed;
              return (
                <div
                  key={item.key}
                  onClick={() => toggleItem(item.key, item.label)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #111',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#111'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0,
                    border: isCompleted ? '2px solid #00ff88' : '2px solid #333',
                    background: isCompleted ? '#00ff8820' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {isCompleted && <span style={{ color: '#00ff88', fontSize: '14px', fontWeight: '700' }}>✓</span>}
                  </div>
                  {/* Label */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '13px', fontWeight: '500',
                      color: isCompleted ? '#00ff88' : '#ccc',
                      textDecoration: isCompleted ? 'line-through' : 'none'
                    }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{item.description}</div>
                  </div>
                  {/* Completed info */}
                  {isCompleted && state?.completedBy && (
                    <div style={{ fontSize: '10px', color: '#555', textAlign: 'right' }}>
                      <div>{state.completedBy}</div>
                      <div>{state.completedAt ? new Date(state.completedAt).toLocaleDateString() : ''}</div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Custom items for this phase */}
            {phaseCustom.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleCustomItem(item)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #111',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'pointer',
                  background: '#050505'
                }}
              >
                <div style={{
                  width: '22px', height: '22px', borderRadius: '4px', flexShrink: 0,
                  border: item.completed ? '2px solid #0088ff' : '2px solid #333',
                  background: item.completed ? '#0088ff20' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {item.completed && <span style={{ color: '#0088ff', fontSize: '14px', fontWeight: '700' }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '13px', fontWeight: '500',
                    color: item.completed ? '#0088ff' : '#ccc',
                    textDecoration: item.completed ? 'line-through' : 'none'
                  }}>
                    {item.label} <span style={{ fontSize: '10px', color: '#555' }}>(custom)</span>
                  </div>
                  {item.description && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{item.description}</div>}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Add Custom Item Modal */}
      {showAddItem && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px', padding: '30px' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', color: '#fff', fontWeight: '600' }}>Add Checklist Item</h2>
              <button onClick={() => setShowAddItem(false)} className="icon-button">×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Label *</label>
                <input
                  type="text"
                  value={newItemForm.label}
                  onChange={(e) => setNewItemForm({ ...newItemForm, label: e.target.value })}
                  placeholder="e.g. Termite Inspection"
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phase</label>
                <select
                  value={newItemForm.phase}
                  onChange={(e) => setNewItemForm({ ...newItemForm, phase: e.target.value })}
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                >
                  {DEFAULT_CHECKLIST.map((p) => (
                    <option key={p.phase} value={p.phase}>{p.phase}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                <input
                  type="text"
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                  placeholder="Optional details"
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1a1a1a' }}>
              <button onClick={addCustomItem} className="btn-primary btn-block">Add Item</button>
              <button onClick={() => setShowAddItem(false)} className="btn-secondary btn-block">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealProgressTab;
