import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../utils/cloudinary';

// Icons
const FileIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
    <polyline points="13 2 13 9 20 9"/>
  </svg>
);

const UploadIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const DownloadIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
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

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'disclosure', label: 'Disclosure' },
  { value: 'title', label: 'Title Document' },
  { value: 'financial', label: 'Financial Document' },
  { value: 'other', label: 'Other' }
];

const UploadModal = ({ deals, properties, onClose, onUpload }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'contract',
    dealId: '',
    propertyId: '',
    description: ''
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      if (!formData.name) {
        setFormData({...formData, name: selectedFile.name});
      }
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!formData.name) {
      setError('Please enter a document name');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Determine resource type based on file extension
      const fileExtension = file.name.split('.').pop().toLowerCase();
      const isPDF = fileExtension === 'pdf';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
      
      let resourceType = 'raw'; // Default for documents
      if (isImage) resourceType = 'image';
      
      // Upload to Cloudinary
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formDataUpload.append('folder', 'documents');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formDataUpload
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Save to Firebase
      const docData = {
        name: formData.name,
        type: formData.type,
        url: data.secure_url,
        size: file.size,
        fileType: fileExtension,
        isPDF: isPDF,
        dealId: formData.dealId || null,
        propertyId: formData.propertyId || null,
        description: formData.description,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'documents'), docData);

      onUpload();
      onClose();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#0a0a0a',
        border: '2px solid #0088ff',
        borderRadius: '8px',
        padding: '30px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h2 style={{ fontSize: '20px', color: '#0088ff', margin: 0, fontWeight: '700' }}>
            Upload Document
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* File Upload */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '20px',
              background: '#0f0f0f',
              border: '2px dashed #0088ff',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: '#0088ff',
              fontSize: '13px',
              fontWeight: '600'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#151515'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#0f0f0f'}
            >
              <UploadIcon size={20} />
              {file ? file.name : 'Click to select file'}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
            {file && (
              <div style={{ fontSize: '11px', color: '#666666', marginTop: '5px' }}>
                Size: {(file.size / 1024).toFixed(2)} KB
              </div>
            )}
          </div>

          <div className="form-field">
            <label>Document Name *</label>
            <input
              type="text"
              placeholder="e.g., Purchase Agreement"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="form-field">
            <label>Document Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              {DOCUMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Link to Deal (optional)</label>
            <select
              value={formData.dealId}
              onChange={(e) => setFormData({...formData, dealId: e.target.value})}
            >
              <option value="">None</option>
              {deals.map(deal => (
                <option key={deal.id} value={deal.id}>
                  {deal.propertyAddress || 'Unknown'} - {deal.buyerName}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Link to Property (optional)</label>
            <select
              value={formData.propertyId}
              onChange={(e) => setFormData({...formData, propertyId: e.target.value})}
            >
              <option value="">None</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.address?.street || 'Unknown'}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea
              placeholder="Add notes about this document..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
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
        </div>

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
            onClick={handleUpload}
            disabled={uploading}
            style={{
              background: '#0088ff',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '700',
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              opacity: uploading ? 0.6 : 1
            }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [deals, setDeals] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAdmin = auth.currentUser.email === 'dealcenterx@gmail.com';

      // Load documents
      const docsQuery = isAdmin
        ? query(collection(db, 'documents'), orderBy('createdAt', 'desc'))
        : query(
            collection(db, 'documents'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc')
          );

      const docsSnapshot = await getDocs(docsQuery);
      const docsData = [];
      docsSnapshot.forEach((doc) => {
        docsData.push({ id: doc.id, ...doc.data() });
      });

      // Load deals for linking
      const dealsQuery = isAdmin
        ? query(collection(db, 'deals'))
        : query(collection(db, 'deals'), where('userId', '==', auth.currentUser.uid));

      const dealsSnapshot = await getDocs(dealsQuery);
      const dealsData = [];
      dealsSnapshot.forEach((doc) => {
        dealsData.push({ id: doc.id, ...doc.data() });
      });

      // Load properties
      const propertiesQuery = isAdmin
        ? query(collection(db, 'properties'))
        : query(collection(db, 'properties'), where('userId', '==', auth.currentUser.uid));

      const propertiesSnapshot = await getDocs(propertiesQuery);
      const propertiesData = [];
      propertiesSnapshot.forEach((doc) => {
        propertiesData.push({ id: doc.id, ...doc.data() });
      });

      setDocuments(docsData);
      setDeals(dealsData);
      setProperties(propertiesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDoc(doc(db, 'documents', docId));
      loadData();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getLinkedEntity = (document) => {
    if (document.dealId) {
      const deal = deals.find(d => d.id === document.dealId);
      return deal ? `Deal: ${deal.propertyAddress}` : 'Deal (deleted)';
    }
    if (document.propertyId) {
      const property = properties.find(p => p.id === document.propertyId);
      return property ? `Property: ${property.address?.street}` : 'Property (deleted)';
    }
    return 'Not linked';
  };

  const filteredDocuments = documents.filter(doc => {
    if (filterType === 'all') return true;
    return doc.type === filterType;
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
        Loading documents...
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
            Documents
          </h2>
          <p style={{ fontSize: '13px', color: '#666666', margin: 0 }}>
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
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
          <UploadIcon size={16} />
          Upload Document
        </button>
      </div>

      {/* Filter */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        borderRadius: '4px',
        padding: '15px 20px',
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '12px', color: '#888888', fontWeight: '600' }}>Filter:</span>
        <button
          onClick={() => setFilterType('all')}
          style={{
            background: filterType === 'all' ? '#0088ff' : 'transparent',
            color: filterType === 'all' ? '#ffffff' : '#888888',
            border: '1px solid ' + (filterType === 'all' ? '#0088ff' : '#1a1a1a'),
            padding: '6px 12px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: 'inherit'
          }}
        >
          All ({documents.length})
        </button>
        {DOCUMENT_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setFilterType(type.value)}
            style={{
              background: filterType === type.value ? '#0088ff' : 'transparent',
              color: filterType === type.value ? '#ffffff' : '#888888',
              border: '1px solid ' + (filterType === type.value ? '#0088ff' : '#1a1a1a'),
              padding: '6px 12px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
              fontFamily: 'inherit'
            }}
          >
            {type.label} ({documents.filter(d => d.type === type.value).length})
          </button>
        ))}
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '4px',
          padding: '40px',
          textAlign: 'center',
          color: '#666666'
        }}>
          {documents.length === 0 
            ? 'No documents yet. Upload your first document!' 
            : `No ${filterType} documents.`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredDocuments.map((document) => {
            const typeConfig = DOCUMENT_TYPES.find(t => t.value === document.type);
            
            return (
              <div
                key={document.id}
                style={{
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  borderRadius: '4px',
                  padding: '15px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#0f0f0f'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0a0a0a'}
              >
                {/* Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#0088ff15',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileIcon size={20} color="#0088ff" />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '5px'
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {document.name}
                    </h3>
                    <span style={{
                      fontSize: '10px',
                      color: '#0088ff',
                      background: '#0088ff15',
                      padding: '3px 8px',
                      borderRadius: '3px',
                      textTransform: 'uppercase',
                      fontWeight: '700',
                      flexShrink: 0
                    }}>
                      {typeConfig?.label}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '15px',
                    fontSize: '11px',
                    color: '#666666'
                  }}>
                    <span>{formatFileSize(document.size)}</span>
                    <span>{formatDate(document.createdAt)}</span>
                    <span>{getLinkedEntity(document)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#0088ff',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                      fontFamily: 'inherit',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <DownloadIcon size={14} />
                    View
                  </a>
                  <button
                    onClick={() => handleDelete(document.id)}
                    style={{
                      background: '#ff3333',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <TrashIcon size={14} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          deals={deals}
          properties={properties}
          onClose={() => setShowUploadModal(false)}
          onUpload={loadData}
        />
      )}
    </div>
  );
};

export default DocumentsPage;
