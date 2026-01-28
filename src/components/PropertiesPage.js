import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import ImageUpload from './ImageUpload';

// Icons
const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const EditIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PropertyModal = ({ property, contacts, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    // Address
    street: '',
    city: '',
    state: '',
    zipCode: '',
    county: '',
    
    // Details
    listPrice: '',
    beds: '',
    baths: '',
    sqft: '',
    lotSize: '',
    yearBuilt: '',
    propertyType: 'single-family',
    
    // Status
    status: 'active',
    mlsNumber: '',
    
    // Financials
    hoa: '',
    taxes: '',
    
    // Description
    description: '',
    features: '',
    
    // Relationships
    sellerId: '',
    
    // Photos
    photos: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (property) {
      setFormData({
        street: property.address?.street || '',
        city: property.address?.city || '',
        state: property.address?.state || '',
        zipCode: property.address?.zipCode || '',
        county: property.address?.county || '',
        listPrice: property.listPrice || '',
        beds: property.beds || '',
        baths: property.baths || '',
        sqft: property.sqft || '',
        lotSize: property.lotSize || '',
        yearBuilt: property.yearBuilt || '',
        propertyType: property.propertyType || 'single-family',
        status: property.status || 'active',
        mlsNumber: property.mlsNumber || '',
        hoa: property.hoa || '',
        taxes: property.taxes || '',
        description: property.description || '',
        features: property.features?.join(', ') || '',
        sellerId: property.sellerId || '',
        photos: property.photos || []
      });
    }
  }, [property]);

  const handleSave = async () => {
    if (!formData.street || !formData.city || !formData.state) {
      setError('Please fill in required address fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const propertyData = {
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          county: formData.county
        },
        listPrice: parseFloat(formData.listPrice) || 0,
        beds: parseInt(formData.beds) || 0,
        baths: parseFloat(formData.baths) || 0,
        sqft: parseInt(formData.sqft) || 0,
        lotSize: parseInt(formData.lotSize) || 0,
        yearBuilt: parseInt(formData.yearBuilt) || 0,
        propertyType: formData.propertyType,
        status: formData.status,
        mlsNumber: formData.mlsNumber,
        hoa: parseFloat(formData.hoa) || 0,
        taxes: parseFloat(formData.taxes) || 0,
        description: formData.description,
        features: formData.features.split(',').map(f => f.trim()).filter(f => f),
        sellerId: formData.sellerId,
        photos: formData.photos,
        userId: auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      };

      if (property) {
        // Update existing
        await updateDoc(doc(db, 'properties', property.id), propertyData);
      } else {
        // Create new
        propertyData.createdAt = new Date().toISOString();
        propertyData.listedDate = new Date().toISOString();
        await addDoc(collection(db, 'properties'), propertyData);
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving property:', err);
      setError('Failed to save property. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sellers = contacts.filter(c => c.contactType === 'seller');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#0a0a0a',
        border: '2px solid #0088ff',
        borderRadius: '8px',
        padding: '30px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h2 style={{ fontSize: '20px', color: '#0088ff', margin: 0, fontWeight: '700' }}>
            {property ? 'Edit Property' : 'Add New Property'}
          </h2>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: 'none',
            color: '#888888',
            cursor: 'pointer',
            padding: '5px'
          }}>
            <XIcon size={24} />
          </button>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Address Section */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#00ff88', marginBottom: '15px' }}>
              Property Address
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="form-field">
                <label>Street Address *</label>
                <input
                  type="text"
                  placeholder="123 Main Street"
                  value={formData.street}
                  onChange={(e) => setFormData({...formData, street: e.target.value})}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
                <div className="form-field">
                  <label>City *</label>
                  <input
                    type="text"
                    placeholder="Los Angeles"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div className="form-field">
                  <label>State *</label>
                  <input
                    type="text"
                    placeholder="CA"
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                  />
                </div>
                <div className="form-field">
                  <label>Zip Code</label>
                  <input
                    type="text"
                    placeholder="90001"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#00ff88', marginBottom: '15px' }}>
              Property Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
              <div className="form-field">
                <label>List Price</label>
                <input
                  type="number"
                  placeholder="750000"
                  value={formData.listPrice}
                  onChange={(e) => setFormData({...formData, listPrice: e.target.value})}
                />
              </div>
              <div className="form-field">
                <label>Beds</label>
                <input
                  type="number"
                  placeholder="3"
                  value={formData.beds}
                  onChange={(e) => setFormData({...formData, beds: e.target.value})}
                />
              </div>
              <div className="form-field">
                <label>Baths</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="2"
                  value={formData.baths}
                  onChange={(e) => setFormData({...formData, baths: e.target.value})}
                />
              </div>
              <div className="form-field">
                <label>Sqft</label>
                <input
                  type="number"
                  placeholder="2000"
                  value={formData.sqft}
                  onChange={(e) => setFormData({...formData, sqft: e.target.value})}
                />
              </div>
              <div className="form-field">
                <label>Lot Size (sqft)</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={formData.lotSize}
                  onChange={(e) => setFormData({...formData, lotSize: e.target.value})}
                />
              </div>
              <div className="form-field">
                <label>Year Built</label>
                <input
                  type="number"
                  placeholder="1995"
                  value={formData.yearBuilt}
                  onChange={(e) => setFormData({...formData, yearBuilt: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Type & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div className="form-field">
              <label>Property Type</label>
              <select
                value={formData.propertyType}
                onChange={(e) => setFormData({...formData, propertyType: e.target.value})}
              >
                <option value="single-family">Single Family</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
                <option value="multi-family">Multi-Family</option>
                <option value="land">Land</option>
              </select>
            </div>
            <div className="form-field">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="sold">Sold</option>
                <option value="off-market">Off Market</option>
              </select>
            </div>
            <div className="form-field">
              <label>Seller</label>
              <select
                value={formData.sellerId}
                onChange={(e) => setFormData({...formData, sellerId: e.target.value})}
              >
                <option value="">Select Seller</option>
                {sellers.map(seller => (
                  <option key={seller.id} value={seller.id}>
                    {seller.firstName} {seller.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Financials */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div className="form-field">
              <label>MLS Number</label>
              <input
                type="text"
                placeholder="MLS123456"
                value={formData.mlsNumber}
                onChange={(e) => setFormData({...formData, mlsNumber: e.target.value})}
              />
            </div>
            <div className="form-field">
              <label>HOA (monthly)</label>
              <input
                type="number"
                placeholder="150"
                value={formData.hoa}
                onChange={(e) => setFormData({...formData, hoa: e.target.value})}
              />
            </div>
            <div className="form-field">
              <label>Taxes (annual)</label>
              <input
                type="number"
                placeholder="8000"
                value={formData.taxes}
                onChange={(e) => setFormData({...formData, taxes: e.target.value})}
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-field">
            <label>Description</label>
            <textarea
              placeholder="Beautiful 3BR home with modern updates..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              style={{
                width: '100%',
                background: '#0f0f0f',
                border: '1px solid #1a1a1a',
                borderRadius: '4px',
                padding: '12px',
                color: '#e0e0e0',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Features */}
          <div className="form-field">
            <label>Features (comma separated)</label>
            <input
              type="text"
              placeholder="pool, granite counters, hardwood floors"
              value={formData.features}
              onChange={(e) => setFormData({...formData, features: e.target.value})}
            />
          </div>

          {/* Photos */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#00ff88', marginBottom: '15px' }}>
              Property Photos
            </div>
            <ImageUpload
              multiple={true}
              folder="properties"
              maxFiles={20}
              existingImages={formData.photos}
              onUploadComplete={(photos) => setFormData({...formData, photos})}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginTop: '25px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#1a1a1a',
              color: '#888888',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'inherit'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#0088ff',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? 'Saving...' : property ? 'Update Property' : 'Add Property'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PropertiesPage = () => {
  const [properties, setProperties] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';

      // Load properties
      const propertiesQuery = isAdmin
        ? query(collection(db, 'properties'), orderBy('createdAt', 'desc'))
        : query(
            collection(db, 'properties'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc')
          );

      const propertiesSnapshot = await getDocs(propertiesQuery);
      const propertiesData = [];
      propertiesSnapshot.forEach((doc) => {
        propertiesData.push({ id: doc.id, ...doc.data() });
      });

      // Load contacts for seller dropdown
      const contactsQuery = isAdmin
        ? query(collection(db, 'contacts'))
        : query(collection(db, 'contacts'), where('userId', '==', auth.currentUser.uid));

      const contactsSnapshot = await getDocs(contactsQuery);
      const contactsData = [];
      contactsSnapshot.forEach((doc) => {
        contactsData.push({ id: doc.id, ...doc.data() });
      });

      setProperties(propertiesData);
      setContacts(contactsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setShowModal(true);
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'properties', propertyId));
      loadData();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredProperties = properties.filter(prop => {
    const matchesSearch = !searchQuery || 
      prop.address?.street?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.address?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prop.mlsNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || prop.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        color: '#666666'
      }}>
        Loading properties...
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '25px'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', margin: '0 0 5px 0' }}>
            Properties
          </h2>
          <p style={{ fontSize: '13px', color: '#666666', margin: 0 }}>
            {filteredProperties.length} propert{filteredProperties.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedProperty(null);
            setShowModal(true);
          }}
          style={{
            background: '#0088ff',
            color: '#ffffff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '700',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textTransform: 'uppercase'
          }}
        >
          <PlusIcon size={16} />
          Add Property
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '4px',
        padding: '20px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '15px'
      }}>
        <div className="form-field" style={{ margin: 0 }}>
          <label style={{ marginBottom: '8px' }}>Search</label>
          <input
            type="text"
            placeholder="Search by address, city, or MLS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="form-field" style={{ margin: 0 }}>
          <label style={{ marginBottom: '8px' }}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
            <option value="off-market">Off Market</option>
          </select>
        </div>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '40px',
          textAlign: 'center',
          color: '#666666'
        }}>
          {properties.length === 0 
            ? 'No properties yet. Add your first listing!' 
            : 'No properties match your filters.'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {filteredProperties.map((property) => (
            <div
              key={property.id}
              style={{
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
                borderRadius: '4px',
                overflow: 'hidden',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0088ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1a1a1a';
              }}
            >
              {/* Photo */}
              <div style={{
                width: '100%',
                height: '200px',
                background: property.photos && property.photos.length > 0
                  ? `url(${property.photos[0].url})`
                  : '#0f0f0f',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: property.status === 'active' ? '#00ff88' : '#ff6600',
                  color: '#000000',
                  padding: '4px 12px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase'
                }}>
                  {property.status}
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: '20px' }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#0088ff',
                  marginBottom: '10px'
                }}>
                  {formatCurrency(property.listPrice)}
                </div>

                <div style={{
                  fontSize: '14px',
                  color: '#ffffff',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  {property.address?.street}
                </div>

                <div style={{
                  fontSize: '12px',
                  color: '#888888',
                  marginBottom: '15px'
                }}>
                  {property.address?.city}, {property.address?.state} {property.address?.zipCode}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '15px',
                  marginBottom: '15px',
                  fontSize: '12px',
                  color: '#ffffff'
                }}>
                  <span>{property.beds} beds</span>
                  <span>{property.baths} baths</span>
                  <span>{property.sqft?.toLocaleString()} sqft</span>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  paddingTop: '15px',
                  borderTop: '1px solid #1a1a1a'
                }}>
                  <button
                    onClick={() => handleEdit(property)}
                    style={{
                      flex: 1,
                      background: '#0088ff',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px'
                    }}
                  >
                    <EditIcon size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(property.id)}
                    style={{
                      flex: 1,
                      background: '#ff3333',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px'
                    }}
                  >
                    <TrashIcon size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PropertyModal
          property={selectedProperty}
          contacts={contacts}
          onClose={() => {
            setShowModal(false);
            setSelectedProperty(null);
          }}
          onSave={loadData}
        />
      )}
    </div>
  );
};

export default PropertiesPage;
