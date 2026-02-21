import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';

const PropertiesPage = ({ globalSearch = '', onSearchChange }) => {
  const toast = useToast();
  const [properties, setProperties] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, property: null });

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const [filterStatus, setFilterStatus] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [bedsFilter, setBedsFilter] = useState('any');
  const [bathsFilter, setBathsFilter] = useState('any');
  const [sortBy, setSortBy] = useState('date-desc');

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
    description: '',
    images: [],
    sellerId: '',
    sellerName: ''
  });

  const [imageFiles, setImageFiles] = useState([]);

  const CLOUDINARY_UPLOAD_PRESET = 'rems_unsigned';
  const CLOUDINARY_CLOUD_NAME = 'djaq0av66'; // Replace with your cloud name

  useEffect(() => {
    loadProperties();
    loadSellers();
  }, []);

  useEffect(() => {
    setSearchTerm(globalSearch || '');
  }, [globalSearch]);

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

  const loadSellers = async () => {
    try {
      const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';
      const sellersQuery = isAdmin
        ? query(collection(db, 'contacts'), where('contactType', '==', 'seller'))
        : query(
            collection(db, 'contacts'),
            where('userId', '==', auth.currentUser.uid),
            where('contactType', '==', 'seller')
          );

      const sellersSnapshot = await getDocs(sellersQuery);
      const sellersData = [];
      sellersSnapshot.forEach((sellerDoc) => {
        sellersData.push({ id: sellerDoc.id, ...sellerDoc.data() });
      });
      setSellers(sellersData);
    } catch (error) {
      console.error('Error loading sellers:', error);
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return {
        url: data.secure_url,
        publicId: data.public_id,
        thumbnail: data.secure_url.replace('/upload/', '/upload/w_400,h_300,c_fill/')
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.address || !formData.city || !formData.state || !formData.zipCode || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      let uploadedImages = [...(formData.images || [])];

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const imageData = await uploadToCloudinary(file);
          uploadedImages.push(imageData);
        }
      }

      const propertyData = {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        price: parseFloat(formData.price),
        beds: parseInt(formData.beds) || 0,
        baths: parseFloat(formData.baths) || 0,
        sqft: parseInt(formData.sqft) || 0,
        propertyType: formData.propertyType,
        sellerId: formData.sellerId || null,
        sellerName: formData.sellerName || null,
        status: formData.status,
        description: formData.description,
        images: uploadedImages,
        featuredImage: uploadedImages[0]?.url || '',
        userId: auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      };

      if (editingProperty) {
        await updateDoc(doc(db, 'properties', editingProperty), propertyData);
        toast.success('Property updated successfully!');
      } else {
        await addDoc(collection(db, 'properties'), {
          ...propertyData,
          createdAt: new Date().toISOString()
        });
        toast.success('Property added successfully!');
      }

      closeModal();
      loadProperties();
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error('Error saving property. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteProperty = async (propertyId) => {
    try {
      await deleteDoc(doc(db, 'properties', propertyId));
      loadProperties();
      toast.success('Property deleted successfully');
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Error deleting property');
    }
  };

  const requestDelete = (property) => {
    setConfirmDelete({ open: true, property });
  };

  const confirmDeleteProperty = async () => {
    if (!confirmDelete.property?.id) return;
    await deleteProperty(confirmDelete.property.id);
    setConfirmDelete({ open: false, property: null });
  };

  const openModal = (property = null) => {
    if (property) {
      setFormData({
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        price: property.price.toString(),
        beds: property.beds.toString(),
        baths: property.baths.toString(),
        sqft: property.sqft.toString(),
        propertyType: property.propertyType,
        status: property.status,
        description: property.description || '',
        images: property.images || [],
        sellerId: property.sellerId || '',
        sellerName: property.sellerName || ''
      });
      setEditingProperty(property.id);
    } else {
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
        description: '',
        images: [],
        sellerId: '',
        sellerName: ''
      });
      setEditingProperty(null);
    }
    setImageFiles([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProperty(null);
    setImageFiles([]);
  };

  const openGallery = (property, imageIndex = 0) => {
    setSelectedProperty(property);
    setCurrentImageIndex(imageIndex);
    setShowGalleryModal(true);
  };

  const closeGallery = () => {
    setShowGalleryModal(false);
    setSelectedProperty(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedProperty && selectedProperty.images) {
      setCurrentImageIndex((prev) => 
        prev === selectedProperty.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedProperty && selectedProperty.images) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedProperty.images.length - 1 : prev - 1
      );
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setPriceRange({ min: '', max: '' });
    setBedsFilter('any');
    setBathsFilter('any');
    setSortBy('date-desc');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (filterStatus !== 'all') count++;
    if (priceRange.min || priceRange.max) count++;
    if (bedsFilter !== 'any') count++;
    if (bathsFilter !== 'any') count++;
    return count;
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#00ff88',
      'under-contract': '#ffaa00',
      pending: '#0088ff',
      sold: '#ff3333'
    };
    return colors[status] || '#888888';
  };

  // Advanced Filtering Logic
  const filteredAndSortedProperties = properties
    // Status filter
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    // Search filter
    .filter(p => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        p.address?.toLowerCase().includes(search) ||
        p.city?.toLowerCase().includes(search) ||
        p.state?.toLowerCase().includes(search) ||
        p.zipCode?.toLowerCase().includes(search)
      );
    })
    // Price range filter
    .filter(p => {
      if (!priceRange.min && !priceRange.max) return true;
      const price = p.price || 0;
      const min = priceRange.min ? parseFloat(priceRange.min) : 0;
      const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
      return price >= min && price <= max;
    })
    // Beds filter
    .filter(p => {
      if (bedsFilter === 'any') return true;
      if (bedsFilter === '4+') return p.beds >= 4;
      return p.beds === parseInt(bedsFilter);
    })
    // Baths filter
    .filter(p => {
      if (bathsFilter === 'any') return true;
      if (bathsFilter === '3+') return p.baths >= 3;
      return p.baths >= parseFloat(bathsFilter);
    })
    // Sort
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'sqft-asc':
          return (a.sqft || 0) - (b.sqft || 0);
        case 'sqft-desc':
          return (b.sqft || 0) - (a.sqft || 0);
        case 'date-desc':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'date-asc':
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        default:
          return 0;
      }
    });

  const statusOptions = [
    { value: 'all', label: 'All', count: properties.length },
    { value: 'available', label: 'Available', count: properties.filter(p => p.status === 'available').length },
    { value: 'under-contract', label: 'Under Contract', count: properties.filter(p => p.status === 'under-contract').length },
    { value: 'sold', label: 'Sold', count: properties.filter(p => p.status === 'sold').length }
  ];

  const bedsOptions = ['any', '1', '2', '3', '4+'];
  const bathsOptions = ['any', '1', '2', '3+'];

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
      {/* Header */}
      <div className="responsive-header" style={{ marginBottom: '30px' }}>
        <div>
          <h2 style={{ fontSize: '20px', color: '#ffffff', fontWeight: '700', margin: 0, marginBottom: '4px' }}>
            Properties
          </h2>
          <p style={{ fontSize: '13px', color: '#888888', margin: 0 }}>
            Showing {filteredAndSortedProperties.length} of {properties.length} properties
          </p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          + Add Property
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by address, city, state, or zip..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (onSearchChange) onSearchChange(e.target.value);
          }}
          style={{ width: '100%', padding: '14px 16px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', color: '#ffffff', fontSize: '14px', transition: 'all 0.3s' }}
          onFocus={(e) => {
            e.target.style.borderColor = '#00ff88';
            e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 136, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#1a1a1a';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Filters Row */}
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '20px', marginBottom: '25px' }}>
        {/* Status Filters */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', color: '#888888', display: 'block', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Status</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {statusOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                style={{
                  padding: '8px 16px',
                  background: filterStatus === option.value ? '#00ff88' : '#0f0f0f',
                  border: `1px solid ${filterStatus === option.value ? '#00ff88' : '#1a1a1a'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '600', color: filterStatus === option.value ? '#000000' : '#ffffff' }}>
                  {option.label}
                </span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: filterStatus === option.value ? '#000000' : '#888888', background: filterStatus === option.value ? 'rgba(0,0,0,0.2)' : '#1a1a1a', padding: '2px 6px', borderRadius: '8px' }}>
                  {option.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', color: '#888888', display: 'block', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Price Range</label>
          <div className="grid-two" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <input
              type="number"
              placeholder="Min Price"
              value={priceRange.min}
              onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
              style={{ padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
            />
            <input
              type="number"
              placeholder="Max Price"
              value={priceRange.max}
              onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
              style={{ padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Beds & Baths Filters */}
        <div className="grid-three" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '20px' }}>
          {/* Beds */}
          <div>
            <label style={{ fontSize: '11px', color: '#888888', display: 'block', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Beds</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {bedsOptions.map((bed) => (
                <div
                  key={bed}
                  onClick={() => setBedsFilter(bed)}
                  style={{
                    padding: '8px 14px',
                    background: bedsFilter === bed ? '#0088ff' : '#0f0f0f',
                    border: `1px solid ${bedsFilter === bed ? '#0088ff' : '#1a1a1a'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: bedsFilter === bed ? '#ffffff' : '#888888',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize'
                  }}
                >
                  {bed}
                </div>
              ))}
            </div>
          </div>

          {/* Baths */}
          <div>
            <label style={{ fontSize: '11px', color: '#888888', display: 'block', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Baths</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {bathsOptions.map((bath) => (
                <div
                  key={bath}
                  onClick={() => setBathsFilter(bath)}
                  style={{
                    padding: '8px 14px',
                    background: bathsFilter === bath ? '#0088ff' : '#0f0f0f',
                    border: `1px solid ${bathsFilter === bath ? '#0088ff' : '#1a1a1a'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: bathsFilter === bath ? '#ffffff' : '#888888',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize'
                  }}
                >
                  {bath}
                </div>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div>
            <label style={{ fontSize: '11px', color: '#888888', display: 'block', marginBottom: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '13px', fontWeight: '500' }}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="sqft-asc">Sqft: Low to High</option>
              <option value="sqft-desc">Sqft: High to Low</option>
            </select>
          </div>
        </div>

        {/* Active Filters & Clear All */}
        {getActiveFiltersCount() > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid #1a1a1a' }}>
            <div style={{ fontSize: '12px', color: '#888888' }}>
              {getActiveFiltersCount()} filter{getActiveFiltersCount() > 1 ? 's' : ''} active
            </div>
            <button
              onClick={clearAllFilters}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '1px solid #ff3333',
                borderRadius: '6px',
                color: '#ff3333',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ff3333';
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#ff3333';
              }}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Properties Grid */}
      {filteredAndSortedProperties.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">🏠</div>
          <div className="empty-state-title">No properties match your filters</div>
          <div className="empty-state-subtitle">Try adjusting your search criteria</div>
          {getActiveFiltersCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="btn-primary"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filteredAndSortedProperties.map((property) => (
            <div
              key={property.id}
              className="card-surface hover-lift"
              style={{ borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = getStatusColor(property.status);
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = `0 12px 30px ${getStatusColor(property.status)}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1a1a1a';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Property Image */}
              <div 
                onClick={() => property.images && property.images.length > 0 && openGallery(property, 0)}
                style={{ 
                  width: '100%', 
                  height: '200px', 
                  background: property.featuredImage 
                    ? `url(${property.featuredImage.replace('/upload/', '/upload/w_400,h_300,c_fill/')})` 
                    : 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative'
                }}
              >
                {/* Status Badge */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#000000',
                  background: getStatusColor(property.status),
                  padding: '6px 12px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {property.status.replace('-', ' ')}
                </div>

                {/* Image Count Badge */}
                {property.images && property.images.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#ffffff',
                    background: 'rgba(0, 0, 0, 0.7)',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backdropFilter: 'blur(10px)'
                  }}>
                    📷 {property.images.length}
                  </div>
                )}

                {/* No Image Placeholder */}
                {(!property.images || property.images.length === 0) && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%', 
                    fontSize: '48px', 
                    opacity: 0.3 
                  }}>
                    🏠
                  </div>
                )}
              </div>

              {/* Property Info */}
              <div style={{ padding: '20px' }}>
                {/* Price */}
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ff88', marginBottom: '10px' }}>
                  ${property.price?.toLocaleString()}
                </div>

                {/* Address */}
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', marginBottom: '4px' }}>
                  {property.address}
                </div>
                <div style={{ fontSize: '12px', color: '#888888', marginBottom: '15px' }}>
                  {property.city}, {property.state} {property.zipCode}
                </div>

                {/* Property Details Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '10px', 
                  marginBottom: '15px',
                  paddingTop: '15px',
                  borderTop: '1px solid #1a1a1a'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{property.beds}</div>
                    <div style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase' }}>Beds</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{property.baths}</div>
                    <div style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase' }}>Baths</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{property.sqft?.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase' }}>Sqft</div>
                  </div>
                </div>

                {/* Property Type */}
                <div style={{ fontSize: '11px', color: '#666666', marginBottom: '15px', textTransform: 'capitalize' }}>
                  {property.propertyType?.replace('-', ' ')}
                </div>

                {property.sellerName && (
                  <div style={{ fontSize: '11px', color: '#00ff88', marginBottom: '15px' }}>
                    Seller: {property.sellerName}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openModal(property); }}
                    className="btn-secondary btn-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); requestDelete(property); }}
                    className="btn-danger btn-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Property Modal - SAME AS BEFORE */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" style={{ padding: '30px', maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontWeight: '600', margin: 0 }}>
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </h2>
              <button onClick={closeModal} className="icon-button">×</button>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gap: '20px' }}>
                {/* Address */}
                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                    style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                  />
                </div>

                {/* City, State, Zip */}
                <div className="grid-city-state-zip" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>City *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      required
                      style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>State *</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      required
                      maxLength={2}
                      style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px', textTransform: 'uppercase' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Zip *</label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                      required
                      style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                    />
                  </div>
                </div>

                {/* Price, Beds, Baths, Sqft */}
                <div className="grid-four" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Price *</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="475000"
                      required
                      style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Beds</label>
                    <select
                      value={formData.beds}
                      onChange={(e) => setFormData({...formData, beds: e.target.value})}
                      style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                    >
                      <option value="">Select</option>
                      <option value="0">Studio</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8+</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Baths</label>
                    <select
                      value={formData.baths}
                      onChange={(e) => setFormData({...formData, baths: e.target.value})}
                      style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                    >
                      <option value="">Select</option>
                      <option value="1">1</option>
                      <option value="1.5">1.5</option>
                      <option value="2">2</option>
                      <option value="2.5">2.5</option>
                      <option value="3">3</option>
                      <option value="3.5">3.5</option>
                      <option value="4">4</option>
                      <option value="4.5">4.5</option>
                      <option value="5">5+</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Sqft</label>
                    <input
                      type="number"
                      value={formData.sqft}
                      onChange={(e) => setFormData({...formData, sqft: e.target.value})}
                      placeholder="2400"
                      style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                    />
                  </div>
                </div>

                {/* Property Type & Status */}
                <div className="grid-two" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Property Type</label>
                    <select
                      value={formData.propertyType}
                      onChange={(e) => setFormData({...formData, propertyType: e.target.value})}
                      style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                    >
                      <option value="single-family">Single Family</option>
                      <option value="condo">Condo</option>
                      <option value="townhouse">Townhouse</option>
                      <option value="multi-family">Multi-Family</option>
                      <option value="commercial">Commercial</option>
                      <option value="land">Land</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                    >
                      <option value="available">Available</option>
                      <option value="under-contract">Under Contract</option>
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Associated Seller</label>
                  <select
                    value={formData.sellerId}
                    onChange={(e) => {
                      const selectedSeller = sellers.find((seller) => seller.id === e.target.value);
                      setFormData({
                        ...formData,
                        sellerId: e.target.value,
                        sellerName: selectedSeller ? `${selectedSeller.firstName} ${selectedSeller.lastName}` : ''
                      });
                    }}
                    style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                  >
                    <option value="">None selected</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.firstName} {seller.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px', resize: 'vertical' }}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase' }}>
                    Upload Photos (Multiple)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ width: '100%', padding: '12px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}
                  />
                  {imageFiles.length > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#00ff88' }}>
                      {imageFiles.length} file(s) selected
                    </div>
                  )}
                </div>

                {/* Existing Images */}
                {editingProperty && formData.images && formData.images.length > 0 && (
                  <div>
                    <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase' }}>
                      Existing Photos ({formData.images.length})
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                      {formData.images.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', paddingTop: '100%', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1a1a1a' }}>
                          <img 
                            src={img.thumbnail || img.url} 
                            alt={`Property ${idx + 1}`}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn-primary btn-block"
                >
                  {uploading ? 'Saving...' : editingProperty ? 'Update Property' : 'Add Property'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={uploading}
                  className="btn-secondary btn-block"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Modal - SAME AS BEFORE */}
      {showGalleryModal && selectedProperty && selectedProperty.images && selectedProperty.images.length > 0 && (
        <div 
          className="modal-overlay gallery-overlay"
          style={{ zIndex: 2000 }} 
          onClick={closeGallery}
        >
          <div className="gallery-modal" style={{ maxWidth: '1200px', width: '100%', height: '80vh', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={closeGallery}
              className="gallery-close"
              style={{
                position: 'absolute',
                top: '-50px',
                right: '0',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '36px',
                cursor: 'pointer',
                padding: '10px',
                zIndex: 10
              }}
            >
              ×
            </button>

            {/* Image Counter */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              left: '0',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600'
            }} className="gallery-counter">
              {currentImageIndex + 1} / {selectedProperty.images.length}
            </div>

            {/* Main Image */}
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative'
            }}>
              <img 
                src={selectedProperty.images[currentImageIndex].url}
                alt={`Property ${currentImageIndex + 1}`}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%', 
                  objectFit: 'contain',
                  borderRadius: '12px'
                }}
              />

              {/* Navigation Buttons */}
              {selectedProperty.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="gallery-nav"
                    style={{
                      position: 'absolute',
                      left: '20px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '32px',
                      padding: '20px 25px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    ‹
                  </button>
                  <button
                    onClick={nextImage}
                    className="gallery-nav"
                    style={{
                      position: 'absolute',
                      right: '20px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '32px',
                      padding: '20px 25px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {selectedProperty.images.length > 1 && (
              <div className="gallery-thumbs" style={{ 
                position: 'absolute', 
                bottom: '-80px', 
                left: 0, 
                right: 0, 
                display: 'flex', 
                gap: '10px', 
                overflowX: 'auto',
                padding: '10px 0'
              }}>
                {selectedProperty.images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    style={{
                      width: '80px',
                      height: '60px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: idx === currentImageIndex ? '3px solid #00ff88' : '3px solid transparent',
                      opacity: idx === currentImageIndex ? 1 : 0.6,
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                  >
                    <img 
                      src={img.thumbnail || img.url}
                      alt={`Thumbnail ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete.open}
        title="Delete property?"
        message={confirmDelete.property?.address ? `Delete "${confirmDelete.property.address}"? This action can't be undone.` : "This action can't be undone."}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={confirmDeleteProperty}
        onCancel={() => setConfirmDelete({ open: false, property: null })}
      />
    </div>
  );
};

export default PropertiesPage;
