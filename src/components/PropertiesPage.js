import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

const PropertiesPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    price: '',
    beds: '',
    baths: '',
    sqft: '',
    propertyType: 'single-family',
    status: 'available',
    description: ''
  });

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';
      
      const propertiesQuery = isAdmin
        ? query(collection(db, 'properties'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'properties'), where('userId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));
      
      const propertiesSnapshot = await getDocs(propertiesQuery);
      const propertiesData = [];
      propertiesSnapshot.forEach((doc) => {
        propertiesData.push({ id: doc.id, ...doc.data() });
      });
      
      setProperties(propertiesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading properties:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingProperty) {
        await updateDoc(doc(db, 'properties', editingProperty.id), {
          ...formData,
          price: parseFloat(formData.price) || 0,
          beds: parseInt(formData.beds) || 0,
          baths: parseFloat(formData.baths) || 0,
          sqft: parseInt(formData.sqft) || 0,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'properties'), {
          ...formData,
          price: parseFloat(formData.price) || 0,
          beds: parseInt(formData.beds) || 0,
          baths: parseFloat(formData.baths) || 0,
          sqft: parseInt(formData.sqft) || 0,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
      }
      
      loadProperties();
      closeModal();
    } catch (error) {
      console.error('Error saving property:', error);
      alert('Error saving property');
    }
  };

  const deleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'properties', propertyId));
      loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Error deleting property');
    }
  };

  const openModal = (property = null) => {
    if (property) {
      setEditingProperty(property);
      setFormData({
        address: property.address || '',
        city: property.city || '',
        state: property.state || '',
        zipCode: property.zipCode || '',
        price: property.price || '',
        beds: property.beds || '',
        baths: property.baths || '',
        sqft: property.sqft || '',
        propertyType: property.propertyType || 'single-family',
        status: property.status || 'available',
        description: property.description || ''
      });
    } else {
      setEditingProperty(null);
      setFormData({
        address: '',
        city: '',
        state: '',
        zipCode: '',
        price: '',
        beds: '',
        baths: '',
        sqft: '',
        propertyType: 'single-family',
        status: 'available',
        description: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProperty(null);
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#00ff88',
      'under-contract': '#ffaa00',
      sold: '#ff3333',
      pending: '#0088ff'
    };
    return colors[status] || '#888888';
  };

  const getStatusLabel = (status) => {
    const labels = {
      available: 'Available',
      'under-contract': 'Under Contract',
      sold: 'Sold',
      pending: 'Pending'
    };
    return labels[status] || status;
  };

  const filteredProperties = properties
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    .filter(p => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        p.address?.toLowerCase().includes(search) ||
        p.city?.toLowerCase().includes(search) ||
        p.state?.toLowerCase().includes(search) ||
        p.zipCode?.toLowerCase().includes(search)
      );
    });

  const statusOptions = [
    { value: 'all', label: 'All Properties', count: properties.length },
    { value: 'available', label: 'Available', count: properties.filter(p => p.status === 'available').length },
    { value: 'under-contract', label: 'Under Contract', count: properties.filter(p => p.status === 'under-contract').length },
    { value: 'sold', label: 'Sold', count: properties.filter(p => p.status === 'sold').length }
  ];

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#666666', fontSize: '14px' }}>
          Loading properties...
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', color: '#ffffff', fontWeight: '700', margin: 0 }}>
          Properties ({filteredProperties.length})
        </h2>
        <button onClick={() => openModal()} style={{ padding: '12px 24px', background: '#00ff88', color: '#000000', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
          + Add Property
        </button>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <input type="text" placeholder="Search by address, city, state, or zip..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 16px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px', marginBottom: '15px' }} />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {statusOptions.map((option) => (
            <div key={option.value} onClick={() => setFilterStatus(option.value)} style={{ padding: '10px 20px', background: filterStatus === option.value ? '#00ff88' : '#0a0a0a', border: `1px solid ${filterStatus === option.value ? '#00ff88' : '#1a1a1a'}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: filterStatus === option.value ? '#000000' : '#ffffff' }}>{option.label}</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: filterStatus === option.value ? '#000000' : '#888888', background: filterStatus === option.value ? '#ffffff' : '#1a1a1a', padding: '2px 8px', borderRadius: '10px' }}>{option.count}</span>
            </div>
          ))}
        </div>
      </div>

      {filteredProperties.length === 0 ? (
        <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '60px', textAlign: 'center', color: '#666666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>No properties found</div>
          <div style={{ fontSize: '13px' }}>Add your first property to get started</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {filteredProperties.map((property) => (
            <div key={property.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '20px', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = getStatusColor(property.status); e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: getStatusColor(property.status), background: `${getStatusColor(property.status)}15`, padding: '4px 12px', borderRadius: '12px', textTransform: 'uppercase' }}>{getStatusLabel(property.status)}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={(e) => { e.stopPropagation(); openModal(property); }} style={{ background: '#1a1a1a', border: 'none', color: '#0088ff', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteProperty(property.id); }} style={{ background: '#1a1a1a', border: 'none', color: '#ff3333', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff', marginBottom: '4px' }}>{property.address}</div>
                <div style={{ fontSize: '13px', color: '#888888' }}>{property.city}, {property.state} {property.zipCode}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#666666', marginBottom: '4px' }}>Price</div>
                  <div style={{ fontSize: '15px', color: '#00ff88', fontWeight: '700' }}>${(property.price || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#666666', marginBottom: '4px' }}>Beds</div>
                  <div style={{ fontSize: '15px', color: '#ffffff', fontWeight: '600' }}>{property.beds || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#666666', marginBottom: '4px' }}>Baths</div>
                  <div style={{ fontSize: '15px', color: '#ffffff', fontWeight: '600' }}>{property.baths || 0}</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#666666', borderTop: '1px solid #1a1a1a', paddingTop: '12px' }}>
                {property.sqft ? `${property.sqft.toLocaleString()} sqft` : 'Size not specified'} • {property.propertyType || 'Type not specified'}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={closeModal}>
          <div style={{ background: '#0a0a0a', border: '2px solid #1a1a1a', borderRadius: '12px', padding: '30px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontWeight: '600', margin: 0 }}>
                {editingProperty ? 'Edit Property' : 'Add Property'}
              </h2>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: '#888888', fontSize: '24px', cursor: 'pointer', padding: 0 }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Address</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>City</label>
                    <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>State</label>
                    <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Zip</label>
                    <input type="text" value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Price</label>
                    <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Beds</label>
                    <input type="number" value={formData.beds} onChange={(e) => setFormData({...formData, beds: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Baths</label>
                    <input type="number" step="0.5" value={formData.baths} onChange={(e) => setFormData({...formData, baths: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Sqft</label>
                    <input type="number" value={formData.sqft} onChange={(e) => setFormData({...formData, sqft: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Property Type</label>
                    <select value={formData.propertyType} onChange={(e) => setFormData({...formData, propertyType: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}>
                      <option value="single-family">Single Family</option>
                      <option value="condo">Condo</option>
                      <option value="townhouse">Townhouse</option>
                      <option value="multi-family">Multi-Family</option>
                      <option value="land">Land</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}>
                      <option value="available">Available</option>
                      <option value="under-contract">Under Contract</option>
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4} style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px', resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', background: '#00ff88', color: '#000000', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  {editingProperty ? 'Update Property' : 'Add Property'}
                </button>
                <button type="button" onClick={closeModal} style={{ flex: 1, padding: '12px', background: '#1a1a1a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPage;