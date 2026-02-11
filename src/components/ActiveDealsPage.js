import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';

const ActiveDealsPage = () => {
  const toast = useToast();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, deal: null });

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';
      
      const dealsQuery = isAdmin
        ? query(collection(db, 'deals'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'deals'), where('userId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));
      
      const dealsSnapshot = await getDocs(dealsQuery);
      const dealsData = [];
      dealsSnapshot.forEach((doc) => {
        dealsData.push({ id: doc.id, ...doc.data() });
      });
      
      setDeals(dealsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading deals:', error);
      setLoading(false);
    }
  };

  const updateDealStatus = async (dealId, newStatus) => {
    try {
      await updateDoc(doc(db, 'deals', dealId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      loadDeals();
      if (selectedDeal && selectedDeal.id === dealId) {
        setSelectedDeal({ ...selectedDeal, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error('Error updating deal status');
    }
  };

  const deleteDeal = async (dealId) => {
    try {
      await deleteDoc(doc(db, 'deals', dealId));
      loadDeals();
      setShowDetailModal(false);
      toast.success('Deal deleted successfully');
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast.error('Error deleting deal');
    }
  };

  const requestDelete = (deal) => {
    setConfirmDelete({ open: true, deal });
  };

  const confirmDeleteDeal = async () => {
    if (!confirmDelete.deal?.id) return;
    await deleteDeal(confirmDelete.deal.id);
    setConfirmDelete({ open: false, deal: null });
  };

  const getStatusColor = (status) => {
    const colors = {
      new: '#ffaa00',
      active: '#00ff88',
      pending: '#0088ff',
      closed: '#aa00ff'
    };
    return colors[status] || '#888888';
  };

  const getStatusLabel = (status) => {
    const labels = {
      new: 'New',
      active: 'Active',
      pending: 'Pending',
      closed: 'Closed'
    };
    return labels[status] || status;
  };

  const filteredDeals = filterStatus === 'all' 
    ? deals 
    : deals.filter(d => d.status === filterStatus);

  const statusOptions = [
    { value: 'all', label: 'All Deals', count: deals.length },
    { value: 'new', label: 'New', count: deals.filter(d => d.status === 'new').length },
    { value: 'active', label: 'Active', count: deals.filter(d => d.status === 'active').length },
    { value: 'pending', label: 'Pending', count: deals.filter(d => d.status === 'pending').length },
    { value: 'closed', label: 'Closed', count: deals.filter(d => d.status === 'closed').length }
  ];

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '10px' }}>
        {statusOptions.map((option) => (
          <div
            key={option.value}
            onClick={() => setFilterStatus(option.value)}
            className={`filter-chip ${filterStatus === option.value ? 'active' : ''}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            <span className="chip-label">{option.label}</span>
            <span className="chip-count">{option.count}</span>
          </div>
        ))}
      </div>

      {/* Deals Grid */}
      {filteredDeals.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">💼</div>
          <div className="empty-state-title">No {filterStatus === 'all' ? '' : getStatusLabel(filterStatus)} deals found</div>
          <div className="empty-state-subtitle">Create a new deal from the Deals → New Deal page</div>
        </div>
      ) : (
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {filteredDeals.map((deal) => (
            <div key={deal.id} onClick={() => { setSelectedDeal(deal); setShowDetailModal(true); }} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = getStatusColor(deal.status); e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: getStatusColor(deal.status), background: `${getStatusColor(deal.status)}15`, padding: '4px 12px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{getStatusLabel(deal.status)}</span>
                <span style={{ fontSize: '11px', color: '#666666' }}>{deal.createdAt ? new Date(deal.createdAt).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff', marginBottom: '4px' }}>{deal.propertyAddress || 'No address'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#888888', minWidth: '50px' }}>Buyer:</span>
                  <span style={{ fontSize: '13px', color: '#0088ff', fontWeight: '600' }}>{deal.buyerName || 'Not set'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#888888', minWidth: '50px' }}>Seller:</span>
                  <span style={{ fontSize: '13px', color: '#00ff88', fontWeight: '600' }}>{deal.sellerName || 'Not set'}</span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#00ff88', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>View Details →</div>
            </div>
          ))}
        </div>
      )}

      {/* Deal Detail Modal */}
      {showDetailModal && selectedDeal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '30px', maxWidth: '600px' }}>
            <div className="modal-header" style={{ marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', color: '#ffffff', marginBottom: '8px', fontWeight: '600' }}>Deal Details</h2>
                <span className="badge" style={{ color: getStatusColor(selectedDeal.status), background: `${getStatusColor(selectedDeal.status)}15` }}>
                  {getStatusLabel(selectedDeal.status)}
                </span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="icon-button">×</button>
            </div>
            <div className="card-surface" style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Property Address</div>
              <div style={{ fontSize: '18px', color: '#ffffff', fontWeight: '600' }}>{selectedDeal.propertyAddress || 'Not set'}</div>
            </div>
            <div className="grid-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Buyer</div>
                <div style={{ fontSize: '15px', color: '#0088ff', fontWeight: '600' }}>{selectedDeal.buyerName || 'Not set'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seller</div>
                <div style={{ fontSize: '15px', color: '#00ff88', fontWeight: '600' }}>{selectedDeal.sellerName || 'Not set'}</div>
              </div>
            </div>
            <div className="grid-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</div>
                <div style={{ fontSize: '14px', color: '#ffffff' }}>{selectedDeal.createdAt ? new Date(selectedDeal.createdAt).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#888888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Updated</div>
                <div style={{ fontSize: '14px', color: '#ffffff' }}>{selectedDeal.updatedAt ? new Date(selectedDeal.updatedAt).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
            <div className="card-surface" style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: '#888888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Update Status</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['new', 'active', 'pending', 'closed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => updateDealStatus(selectedDeal.id, status)}
                    disabled={selectedDeal.status === status}
                    className={selectedDeal.status === status ? 'btn-primary' : 'btn-secondary'}
                    style={selectedDeal.status === status ? { background: getStatusColor(status), color: '#000000' } : undefined}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', paddingTop: '20px', borderTop: '1px solid #1a1a1a' }}>
              <button onClick={() => requestDelete(selectedDeal)} className="btn-danger btn-block">Delete Deal</button>
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary btn-block">Close</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete.open}
        title="Delete deal?"
        message={confirmDelete.deal?.propertyAddress ? `Delete "${confirmDelete.deal.propertyAddress}"? This action can't be undone.` : "This action can't be undone."}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={confirmDeleteDeal}
        onCancel={() => setConfirmDelete({ open: false, deal: null })}
      />
    </div>
  );
};

export default ActiveDealsPage;
