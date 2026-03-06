import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, doc, updateDoc, where } from 'firebase/firestore';
import { useToast } from './Toast';
import { BuyerIcon, SellerIcon, PropertyIcon, Plus } from './Icons';
import { normalizeAddressValue } from '../utils/helpers';

// DEALS PAGE - New Deal (IMPROVED UX)
const NewDealPage = () => {
  const [dealData, setDealData] = useState({
    buyer: '',
    seller: '',
    property: ''
  });
  const [contacts, setContacts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [propertyInput, setPropertyInput] = useState('');
  const toast = useToast();
  // Load contacts and properties from Firebase
  React.useEffect(() => {
    const loadData = async () => {
      try {
const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';

const querySnapshot = isAdmin
  ? await getDocs(collection(db, 'contacts'))
  : await getDocs(
      query(
        collection(db, 'contacts'),
        where('userId', '==', auth.currentUser.uid)
      )
    );
        const contactsData = [];
        querySnapshot.forEach((doc) => {
          contactsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setContacts(contactsData);

        const propertiesQuery = isAdmin
          ? query(collection(db, 'properties'))
          : query(collection(db, 'properties'), where('userId', '==', auth.currentUser.uid));

        const propertiesSnapshot = await getDocs(propertiesQuery);
        const propertiesData = [];
        propertiesSnapshot.forEach((propertyDoc) => {
          propertiesData.push({
            id: propertyDoc.id,
            ...propertyDoc.data()
          });
        });
        setProperties(propertiesData);
      } catch (error) {
        console.error('Error loading contacts/properties:', error);
      }
    };
    loadData();
  }, []);

  const handleSaveDeal = async () => {
    if (!dealData.buyer || !dealData.seller || !dealData.property) {
      toast.error('Please select a buyer, seller, and property');
      return;
    }

    setSaving(true);

    try {
      const buyer = contacts.find(c => c.id === dealData.buyer);
      const seller = contacts.find(c => c.id === dealData.seller);
      const sellerName = `${seller.firstName} ${seller.lastName}`;
      const normalizedPropertyInput = normalizeAddressValue(dealData.property);
      const matchedProperty = properties.find((property) => {
        const fullAddress = `${property.address || ''}, ${property.city || ''}, ${property.state || ''} ${property.zipCode || ''}`;
        return (
          normalizeAddressValue(fullAddress) === normalizedPropertyInput ||
          normalizeAddressValue(property.address || '') === normalizedPropertyInput
        );
      });

      await addDoc(collection(db, 'deals'), {
  buyerId: dealData.buyer,
  buyerName: `${buyer.firstName} ${buyer.lastName}`,
  sellerId: dealData.seller,
  sellerName,
  propertyId: matchedProperty?.id || null,
  propertyType: matchedProperty?.propertyType || null,
  propertyAddress: dealData.property,
  status: 'new',
  userId: auth.currentUser.uid,
  createdAt: new Date().toISOString()
});

      if (matchedProperty?.id) {
        await updateDoc(doc(db, 'properties', matchedProperty.id), {
          sellerId: dealData.seller,
          sellerName,
          updatedAt: new Date().toISOString()
        });
      }

      toast.success('Deal created successfully!');

      // Reset form
      setDealData({
        buyer: '',
        seller: '',
        property: ''
      });
      setPropertyInput('');
    } catch (error) {
      console.error('Error saving deal:', error);
      toast.error('Error saving deal. Check console.');
    } finally {
      setSaving(false);
    }
  };

  const buyers = contacts.filter(c => c.contactType === 'buyer');
  const sellers = contacts.filter(c => c.contactType === 'seller');

  const getSelectedBuyer = () => contacts.find(c => c.id === dealData.buyer);
  const getSelectedSeller = () => contacts.find(c => c.id === dealData.seller);

  return (
    <div className="new-deal-page">
      <div className="deal-cards-grid">
        {/* Buyer Card */}
        <div
          className="deal-card"
          onClick={() => setShowBuyerModal(true)}
          style={{
            background: dealData.buyer ? '#0f0f0f' : '#0a0a0a',
            borderColor: dealData.buyer ? '#0088ff' : '#1a1a1a'
          }}
        >
          <div className="deal-icon-circle" style={{ background: '#0088ff15' }}>
            <BuyerIcon size={80} color="#0088ff" />
          </div>

          {dealData.buyer ? (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{
                background: '#0088ff',
                color: '#000000',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '24px',
                marginBottom: '15px'
              }}>✓</div>
              <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', marginBottom: '4px' }}>
                {getSelectedBuyer()?.firstName} {getSelectedBuyer()?.lastName}
              </div>
              <div style={{ fontSize: '11px', color: '#888888' }}>
                {getSelectedBuyer()?.email}
              </div>
            </div>
          ) : (
            <>
              <div className="deal-plus-button" style={{ background: '#0088ff' }}>
                <Plus size={32} color="#000000" />
              </div>
              <h3>Add Buyer</h3>
            </>
          )}
        </div>

        {/* Seller Card */}
        <div
          className="deal-card"
          onClick={() => setShowSellerModal(true)}
          style={{
            background: dealData.seller ? '#0f0f0f' : '#0a0a0a',
            borderColor: dealData.seller ? '#00ff88' : '#1a1a1a'
          }}
        >
          <div className="deal-icon-circle" style={{ background: '#00ff8815' }}>
            <SellerIcon size={80} color="#00ff88" />
          </div>

          {dealData.seller ? (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{
                background: '#00ff88',
                color: '#000000',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '24px',
                marginBottom: '15px'
              }}>✓</div>
              <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', marginBottom: '4px' }}>
                {getSelectedSeller()?.firstName} {getSelectedSeller()?.lastName}
              </div>
              <div style={{ fontSize: '11px', color: '#888888' }}>
                {getSelectedSeller()?.email}
              </div>
            </div>
          ) : (
            <>
              <div className="deal-plus-button" style={{ background: '#00ff88' }}>
                <Plus size={32} color="#000000" />
              </div>
              <h3>Add Seller</h3>
            </>
          )}
        </div>

        {/* Property Card */}
        <div
          className="deal-card"
          onClick={() => setShowPropertyModal(true)}
          style={{
            background: dealData.property ? '#0f0f0f' : '#0a0a0a',
            borderColor: dealData.property ? '#ffaa00' : '#1a1a1a'
          }}
        >
          <div className="deal-icon-circle" style={{ background: '#ffaa0015' }}>
            <PropertyIcon size={80} color="#ffaa00" />
          </div>

          {dealData.property ? (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{
                background: '#ffaa00',
                color: '#000000',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '24px',
                marginBottom: '15px'
              }}>✓</div>
              <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', wordBreak: 'break-word', padding: '0 10px' }}>
                {dealData.property}
              </div>
            </div>
          ) : (
            <>
              <div className="deal-plus-button" style={{ background: '#ffaa00' }}>
                <Plus size={32} color="#000000" />
              </div>
              <h3>Add Property</h3>
            </>
          )}
        </div>
      </div>

      {/* Create Deal Button - Fixed Bottom Right */}
      {dealData.buyer && dealData.seller && dealData.property && (
        <div className="floating-action" style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 999
        }}>
    <button
      onClick={handleSaveDeal}
      disabled={saving}
      style={{
        background: '#00ff88',
        color: '#000000',
        border: 'none',
        padding: '18px 40px',
        fontSize: '15px',
        fontWeight: '700',
        borderRadius: '8px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        boxShadow: '0 4px 20px rgba(0, 255, 136, 0.4)',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 6px 30px rgba(0, 255, 136, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 255, 136, 0.4)';
      }}
    >
      {saving ? 'Creating Deal...' : '✓ Create Deal'}
    </button>
  </div>
)}

      {/* Buyer Selection Modal */}
      {showBuyerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderColor: '#0088ff', padding: '30px', maxWidth: '600px', width: '90%', maxHeight: '80vh' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#0088ff', margin: 0 }}>Select Buyer</h2>
              <button
                onClick={() => setShowBuyerModal(false)}
                className="icon-button"
              >×</button>
            </div>

            {buyers.length === 0 ? (
              <div style={{
                background: '#0f0f0f',
                border: '1px solid #1a1a1a',
                padding: '30px',
                textAlign: 'center',
                color: '#666666',
                borderRadius: '4px'
              }}>
                No buyers found. Add one in the Contacts page first!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {buyers.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setDealData({...dealData, buyer: contact.id});
                      setShowBuyerModal(false);
                    }}
                    style={{
                      background: dealData.buyer === contact.id ? '#1a1a1a' : '#0f0f0f',
                      border: dealData.buyer === contact.id ? '1px solid #0088ff' : '1px solid #1a1a1a',
                      padding: '15px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (dealData.buyer !== contact.id) {
                        e.currentTarget.style.background = '#151515';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (dealData.buyer !== contact.id) {
                        e.currentTarget.style.background = '#0f0f0f';
                      }
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', marginBottom: '4px' }}>
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888888' }}>
                      {contact.email} • {contact.phone}
                    </div>
                    {contact.buyerType && (
                      <div style={{ fontSize: '11px', color: '#0088ff', marginTop: '4px', textTransform: 'capitalize' }}>
                        {contact.buyerType}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seller Selection Modal */}
      {showSellerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderColor: '#00ff88', padding: '30px', maxWidth: '600px', width: '90%', maxHeight: '80vh' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#00ff88', margin: 0 }}>Select Seller</h2>
              <button
                onClick={() => setShowSellerModal(false)}
                className="icon-button"
              >×</button>
            </div>

            {sellers.length === 0 ? (
              <div style={{
                background: '#0f0f0f',
                border: '1px solid #1a1a1a',
                padding: '30px',
                textAlign: 'center',
                color: '#666666',
                borderRadius: '4px'
              }}>
                No sellers found. Add one in the Contacts page first!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sellers.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setDealData({...dealData, seller: contact.id});
                      setShowSellerModal(false);
                    }}
                    style={{
                      background: dealData.seller === contact.id ? '#1a1a1a' : '#0f0f0f',
                      border: dealData.seller === contact.id ? '1px solid #00ff88' : '1px solid #1a1a1a',
                      padding: '15px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (dealData.seller !== contact.id) {
                        e.currentTarget.style.background = '#151515';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (dealData.seller !== contact.id) {
                        e.currentTarget.style.background = '#0f0f0f';
                      }
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', marginBottom: '4px' }}>
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888888' }}>
                      {contact.email} • {contact.phone}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Property Input Modal */}
      {showPropertyModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderColor: '#ffaa00', padding: '30px', maxWidth: '500px', width: '90%' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', color: '#ffaa00', margin: 0 }}>Enter Property Address</h2>
              <button
                onClick={() => setShowPropertyModal(false)}
                className="icon-button"
              >×</button>
            </div>

            <div className="form-field" style={{ marginBottom: '20px' }}>
              <label>Property Address *</label>
              <input
                type="text"
                placeholder="e.g., 123 Main Street, Los Angeles, CA 90001"
                value={propertyInput}
                onChange={(e) => setPropertyInput(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f0f0f',
                  border: '1px solid #1a1a1a',
                  padding: '12px 15px',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  borderRadius: '4px',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>

            <button
              onClick={() => {
                if (propertyInput.trim()) {
                  setDealData({...dealData, property: propertyInput.trim()});
                  setShowPropertyModal(false);
                } else {
                  toast.error('Please enter a property address');
                }
              }}
              className="btn-warning btn-block"
            >
              Save Property
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewDealPage;
