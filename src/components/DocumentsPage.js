import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  startAfter,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from './Toast';
import ConfirmModal from './ConfirmModal';
import { isAdminUser } from '../utils/helpers';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../utils/cloudinary';
import useDebounce from '../utils/useDebounce';

const DOCUMENTS_PAGE_SIZE = 30;

const DocumentsPage = ({ globalSearch = '', onSearchChange }) => {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCursors, setPageCursors] = useState([null]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchInput, setSearchInput] = useState(globalSearch);
  const searchTerm = useDebounce(searchInput, 250);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, document: null });
  const pageCursorsRef = useRef(pageCursors);
  
  const [uploadData, setUploadData] = useState({
    file: null,
    fileName: '',
    category: 'contract',
    description: '',
    linkedTo: '',
    linkedType: 'none'
  });

  const loadDocuments = useCallback(async (targetPage = 0, forceReset = false) => {
    const sanitizedPage = Math.max(0, Number(targetPage) || 0);
    try {
      const isAdmin = isAdminUser();
      setLoading(true);

      const docsConstraints = [collection(db, 'documents')];
      if (!isAdmin) {
        docsConstraints.push(where('userId', '==', auth.currentUser.uid));
      }
      if (filterCategory !== 'all') {
        docsConstraints.push(where('category', '==', filterCategory));
      }
      docsConstraints.push(orderBy('createdAt', 'desc'), limit(DOCUMENTS_PAGE_SIZE + 1));

      const cursor = forceReset ? null : pageCursorsRef.current[sanitizedPage];
      if (cursor) {
        docsConstraints.push(startAfter(cursor));
      }

      const docsSnapshot = await getDocs(query(...docsConstraints));
      const docsData = [];
      docsSnapshot.docs.slice(0, DOCUMENTS_PAGE_SIZE).forEach((doc) => {
        docsData.push({ id: doc.id, ...doc.data() });
      });
      const nextCursor = docsSnapshot.docs.length > DOCUMENTS_PAGE_SIZE
        ? docsSnapshot.docs[DOCUMENTS_PAGE_SIZE - 1]
        : null;
      setHasNextPage(Boolean(nextCursor));
      setPageCursors((prev) => {
        const next = [...prev];
        next[sanitizedPage + 1] = nextCursor;
        if (next.length > sanitizedPage + 2) {
          next.splice(sanitizedPage + 2);
        }
        return next;
      });

      if (forceReset) {
        setPageIndex(0);
      } else {
        setPageIndex(sanitizedPage);
      }

      setDocuments(docsData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading documents:', error);
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => {
    pageCursorsRef.current = pageCursors;
  }, [pageCursors]);

  useEffect(() => {
    loadDocuments(0, true);
  }, [loadDocuments]);

  useEffect(() => {
    setSearchInput(globalSearch || '');
  }, [globalSearch]);

  useEffect(() => {
    setPageIndex(0);
    setPageCursors([null]);
    setLoading(true);
    loadDocuments(0, true);
  }, [filterCategory, loadDocuments]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadData({
        ...uploadData,
        file: file,
        fileName: file.name
      });
    }
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
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
        format: data.format,
        size: data.bytes
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadData.file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);

    try {
      const cloudinaryData = await uploadToCloudinary(uploadData.file);

      await addDoc(collection(db, 'documents'), {
        fileName: uploadData.fileName,
        category: uploadData.category,
        description: uploadData.description,
        linkedTo: uploadData.linkedTo,
        linkedType: uploadData.linkedType,
        fileUrl: cloudinaryData.url,
        publicId: cloudinaryData.publicId,
        fileFormat: cloudinaryData.format,
        fileSize: cloudinaryData.size,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });

      loadDocuments(0, true);
      closeUploadModal();
      toast.success('Document uploaded successfully!');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error uploading document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId) => {
    try {
      await deleteDoc(doc(db, 'documents', documentId));
      loadDocuments(0, true);
      toast.success('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error deleting document');
    }
  };

  const requestDelete = (document) => {
    setConfirmDelete({ open: true, document });
  };

  const confirmDeleteDocument = async () => {
    if (!confirmDelete.document?.id) return;
    await deleteDocument(confirmDelete.document.id);
    setConfirmDelete({ open: false, document: null });
  };

  const openUploadModal = () => {
    setUploadData({
      file: null,
      fileName: '',
      category: 'contract',
      description: '',
      linkedTo: '',
      linkedType: 'none'
    });
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
  };

  const handleNextPage = () => {
    if (!hasNextPage) return;
    loadDocuments(pageIndex + 1);
  };

  const handlePrevPage = () => {
    if (pageIndex === 0) return;
    loadDocuments(pageIndex - 1);
  };

  const getCategoryColor = (category) => {
    const colors = {
      contract: '#00ff88',
      inspection: '#ffaa00',
      photo: '#0088ff',
      legal: '#aa00ff',
      financial: '#ff6600',
      other: '#888888'
    };
    return colors[category] || '#888888';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      contract: '📄',
      inspection: '🔍',
      photo: '📷',
      legal: '⚖️',
      financial: '💰',
      other: '📎'
    };
    return icons[category] || '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredDocuments = useMemo(() => documents
    .filter(d => filterCategory === 'all' || d.category === filterCategory)
    .filter(d => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        d.fileName?.toLowerCase().includes(search) ||
        d.description?.toLowerCase().includes(search) ||
        d.category?.toLowerCase().includes(search)
      );
    }),
  [documents, filterCategory, searchTerm]);

  const categoryOptions = [
    { value: 'all', label: 'All Documents', count: documents.length },
    { value: 'contract', label: 'Contracts', count: documents.filter(d => d.category === 'contract').length },
    { value: 'inspection', label: 'Inspections', count: documents.filter(d => d.category === 'inspection').length },
    { value: 'photo', label: 'Photos', count: documents.filter(d => d.category === 'photo').length },
    { value: 'legal', label: 'Legal', count: documents.filter(d => d.category === 'legal').length },
    { value: 'financial', label: 'Financial', count: documents.filter(d => d.category === 'financial').length },
    { value: 'other', label: 'Other', count: documents.filter(d => d.category === 'other').length }
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
      <div className="responsive-header" style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', color: '#ffffff', fontWeight: '700', margin: 0 }}>
          Documents
        </h2>
        <button onClick={openUploadModal} className="btn-primary">+ Upload Document</button>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <input type="text" placeholder="Search documents..." value={searchInput} onChange={(e) => { setSearchInput(e.target.value); if (onSearchChange) onSearchChange(e.target.value); }} style={{ width: '100%', padding: '12px 16px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px', marginBottom: '15px' }} />
        <div className="filters-row">
          {categoryOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => setFilterCategory(option.value)}
              className={`filter-chip ${filterCategory === option.value ? 'active' : ''}`}
            >
              <span className="chip-label">{option.label}</span>
              <span className="chip-count">{option.count}</span>
            </div>
          ))}
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">📁</div>
          <div className="empty-state-title">No documents found</div>
          <div className="empty-state-subtitle">Upload your first document to get started</div>
        </div>
      ) : (
        <div className="cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filteredDocuments.map((document) => (
            <div key={document.id} className="card-surface hover-lift">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>{getCategoryIcon(document.category)}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: getCategoryColor(document.category), background: `${getCategoryColor(document.category)}15`, padding: '4px 10px', borderRadius: '10px', textTransform: 'uppercase' }}>{document.category}</span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', marginBottom: '4px', wordBreak: 'break-word' }}>{document.fileName}</div>
                {document.description && <div style={{ fontSize: '12px', color: '#888888', lineHeight: '1.4' }}>{document.description}</div>}
              </div>
              <div style={{ fontSize: '11px', color: '#666666', marginBottom: '16px' }}>{formatFileSize(document.fileSize || 0)} • {document.fileFormat?.toUpperCase() || 'N/A'}</div>
              {document.linkedTo && document.linkedType !== 'none' && (
                <div style={{ fontSize: '11px', color: '#0088ff', marginBottom: '16px', padding: '8px', background: '#0088ff15', borderRadius: '4px' }}>Linked to: {document.linkedType} - {document.linkedTo}</div>
              )}
              <div style={{ fontSize: '11px', color: '#666666', marginBottom: '16px', borderTop: '1px solid #1a1a1a', paddingTop: '12px' }}>Uploaded: {document.createdAt ? new Date(document.createdAt).toLocaleDateString() : 'N/A'}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm btn-block">View</a>
                <button onClick={() => requestDelete(document)} className="btn-danger btn-sm btn-block">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {filteredDocuments.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#888888' }}>
            Showing {filteredDocuments.length} document{filteredDocuments.length === 1 ? '' : 's'} on this page
            {hasNextPage ? ' · more available' : ''}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrevPage} disabled={pageIndex === 0} className="btn-secondary btn-sm">
              ← Previous
            </button>
            <button onClick={handleNextPage} disabled={!hasNextPage} className="btn-primary btn-sm">
              Next →
            </button>
          </div>
        </div>
      )}
      {showUploadModal && (
        <div className="modal-overlay" onClick={closeUploadModal}>
          <div className="modal-content" style={{ padding: '30px', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', color: '#ffffff', fontWeight: '600', margin: 0 }}>Upload Document</h2>
              <button onClick={closeUploadModal} className="icon-button">×</button>
            </div>
            <form onSubmit={handleUpload}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Select File</label>
                  <input type="file" onChange={handleFileSelect} required style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>File Name</label>
                  <input type="text" value={uploadData.fileName} onChange={(e) => setUploadData({...uploadData, fileName: e.target.value})} required style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Category</label>
                  <select value={uploadData.category} onChange={(e) => setUploadData({...uploadData, category: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }}>
                    <option value="contract">Contract</option>
                    <option value="inspection">Inspection</option>
                    <option value="photo">Photo</option>
                    <option value="legal">Legal</option>
                    <option value="financial">Financial</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Description</label>
                  <textarea value={uploadData.description} onChange={(e) => setUploadData({...uploadData, description: e.target.value})} rows={3} style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888888', display: 'block', marginBottom: '6px' }}>Link to</label>
                  <select value={uploadData.linkedType} onChange={(e) => setUploadData({...uploadData, linkedType: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px', marginBottom: '8px' }}>
                    <option value="none">None</option>
                    <option value="deal">Deal</option>
                    <option value="property">Property</option>
                    <option value="contact">Contact</option>
                  </select>
                  {uploadData.linkedType !== 'none' && (
                    <input type="text" placeholder={`Enter ${uploadData.linkedType} ID`} value={uploadData.linkedTo} onChange={(e) => setUploadData({...uploadData, linkedTo: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '6px', color: '#ffffff', fontSize: '14px' }} />
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button type="submit" disabled={uploading} className="btn-primary btn-block">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button type="button" onClick={closeUploadModal} disabled={uploading} className="btn-secondary btn-block">
                  Cancel
                </button>
              </div>
            </form>
            <div style={{ marginTop: '20px', padding: '12px', background: '#ffaa0015', border: '1px solid #ffaa0033', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#ffaa00', fontWeight: '600', marginBottom: '4px' }}>⚠️ Cloudinary Setup Required</div>
              <div style={{ fontSize: '11px', color: '#888888' }}>Update CLOUDINARY_UPLOAD_PRESET and CLOUDINARY_CLOUD_NAME with your credentials.</div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmDelete.open}
        title="Delete document?"
        message={confirmDelete.document?.fileName ? `Delete "${confirmDelete.document.fileName}"? This action can't be undone.` : "This action can't be undone."}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={confirmDeleteDocument}
        onCancel={() => setConfirmDelete({ open: false, document: null })}
      />
    </div>
  );
};

export default DocumentsPage;
