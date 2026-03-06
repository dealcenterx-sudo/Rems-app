import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from './Toast';
import { Plus, FileText, Search } from './Icons';
import { CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_CLOUD_NAME } from '../utils/helpers';

const DOC_CATEGORIES = [
  { value: 'contract', label: 'Purchase Contract', icon: '📄' },
  { value: 'addendum', label: 'Addendum', icon: '📝' },
  { value: 'disclosure', label: 'Disclosure', icon: '📋' },
  { value: 'inspection', label: 'Inspection Report', icon: '🔍' },
  { value: 'appraisal', label: 'Appraisal', icon: '🏠' },
  { value: 'title', label: 'Title Document', icon: '📑' },
  { value: 'loan', label: 'Loan Document', icon: '🏦' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️' },
  { value: 'closing', label: 'Closing Document', icon: '✅' },
  { value: 'legal', label: 'Legal / Attorney', icon: '⚖️' },
  { value: 'other', label: 'Other', icon: '📁' }
];

const DealDocumentsTab = ({ dealId, deal }) => {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', category: 'contract', notes: '', requiresSignature: false });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const loadDocuments = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'deal-documents'), where('dealId', '==', dealId), orderBy('createdAt', 'desc'))
      );
      const data = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
      setDocuments(data);
    } catch (err) {
      console.error('Error loading documents:', err);
    }
    setLoading(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.name) {
        setUploadForm({ ...uploadForm, name: file.name.replace(/\.[^.]+$/, '') });
      }
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile) {
      toast.error('Select a file to upload');
      return;
    }
    setUploading(true);
    try {
      let fileUrl = '';
      let fileType = selectedFile.type;
      let fileSize = selectedFile.size;

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `deal-documents/${dealId}`);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      fileUrl = data.secure_url;

      await addDoc(collection(db, 'deal-documents'), {
        dealId,
        name: uploadForm.name || selectedFile.name,
        category: uploadForm.category,
        notes: uploadForm.notes,
        requiresSignature: uploadForm.requiresSignature,
        signatureStatus: uploadForm.requiresSignature ? 'pending' : null,
        signedBy: [],
        fileUrl,
        fileType,
        fileSize,
        fileName: selectedFile.name,
        uploadedBy: auth.currentUser?.uid || null,
        uploadedByEmail: auth.currentUser?.email || null,
        uploadedByName: auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown',
        createdAt: new Date().toISOString()
      });

      toast.success('Document uploaded');
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadForm({ name: '', category: 'contract', notes: '', requiresSignature: false });
      loadDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      toast.error('Failed to upload document');
    }
    setUploading(false);
  };

  const deleteDocument = async (docId) => {
    try {
      await deleteDoc(doc(db, 'deal-documents', docId));
      toast.success('Document deleted');
      loadDocuments();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const markAsSigned = async (docItem) => {
    try {
      const currentUser = auth.currentUser?.email || 'Unknown';
      const alreadySigned = (docItem.signedBy || []).includes(currentUser);
      if (alreadySigned) {
        toast.info('You already signed this document');
        return;
      }
      await updateDoc(doc(db, 'deal-documents', docItem.id), {
        signedBy: [...(docItem.signedBy || []), currentUser],
        signatureStatus: 'signed',
        lastSignedAt: new Date().toISOString()
      });
      toast.success('Document signed');
      loadDocuments();
    } catch (err) {
      toast.error('Failed to sign');
    }
  };

  const getCategoryInfo = (cat) => DOC_CATEGORIES.find((c) => c.value === cat) || { label: cat, icon: '📁' };

  const filteredDocs = documents.filter((d) => {
    if (filterCategory !== 'all' && d.category !== filterCategory) return false;
    if (searchQuery && !d.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner" /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>Deal Documents</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{documents.length} document{documents.length !== 1 ? 's' : ''}</div>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
          <Plus size={16} color="#000" /> Upload Document
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} color="#666" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '8px 12px 8px 32px', borderRadius: '6px', width: '100%', fontSize: '13px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          <button
            onClick={() => setFilterCategory('all')}
            style={{
              padding: '6px 14px', borderRadius: '14px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap',
              border: filterCategory === 'all' ? '1px solid #00ff88' : '1px solid #333',
              background: filterCategory === 'all' ? '#00ff8815' : '#111',
              color: filterCategory === 'all' ? '#00ff88' : '#888'
            }}
          >All</button>
          {DOC_CATEGORIES.slice(0, 6).map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              style={{
                padding: '6px 14px', borderRadius: '14px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap',
                border: filterCategory === cat.value ? '1px solid #00ff88' : '1px solid #333',
                background: filterCategory === cat.value ? '#00ff8815' : '#111',
                color: filterCategory === cat.value ? '#00ff88' : '#888'
              }}
            >{cat.icon} {cat.label}</button>
          ))}
        </div>
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon"><FileText size={48} color="#333" /></div>
          <div className="empty-state-title">No documents {filterCategory !== 'all' ? `in "${getCategoryInfo(filterCategory).label}"` : 'yet'}</div>
          <div className="empty-state-subtitle">Upload contracts, addendums, disclosures, and more</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredDocs.map((item) => {
            const catInfo = getCategoryInfo(item.category);
            return (
              <div key={item.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ fontSize: '24px', flexShrink: 0 }}>{catInfo.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: '#666', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>{catInfo.label}</span>
                    <span>{formatSize(item.fileSize)}</span>
                    <span>by {item.uploadedByName}</span>
                    <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                  {item.notes && <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{item.notes}</div>}
                </div>

                {/* Signature status */}
                {item.requiresSignature && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                      padding: '3px 10px', borderRadius: '10px',
                      color: item.signatureStatus === 'signed' ? '#00ff88' : '#ffaa00',
                      background: item.signatureStatus === 'signed' ? '#00ff8815' : '#ffaa0015'
                    }}>
                      {item.signatureStatus === 'signed' ? `Signed (${(item.signedBy || []).length})` : 'Needs Signature'}
                    </span>
                    <button
                      onClick={() => markAsSigned(item)}
                      style={{ background: 'none', border: '1px solid #333', color: '#0088ff', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                    >
                      Sign
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: 'none', border: '1px solid #333', color: '#0088ff', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', textDecoration: 'none' }}
                    >
                      View
                    </a>
                  )}
                  <button
                    onClick={() => deleteDocument(item.id)}
                    style={{ background: 'none', border: '1px solid #331111', color: '#ff4444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                  >
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
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', padding: '30px' }}>
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', color: '#fff', fontWeight: '600' }}>Upload Document</h2>
              <button onClick={() => setShowUploadModal(false)} className="icon-button">×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* File Input */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>File *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv,.txt"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '20px', background: '#111', border: '2px dashed #333',
                    borderRadius: '8px', color: '#888', cursor: 'pointer', fontSize: '13px', textAlign: 'center'
                  }}
                >
                  {selectedFile ? (
                    <span style={{ color: '#00ff88' }}>{selectedFile.name} ({formatSize(selectedFile.size)})</span>
                  ) : (
                    'Click to select file or drag & drop'
                  )}
                </button>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Document Name</label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="e.g. Purchase Agreement - 123 Main St"
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px' }}
                >
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</label>
                <textarea
                  value={uploadForm.notes}
                  onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                  placeholder="Optional notes about this document..."
                  rows={2}
                  style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '10px 12px', borderRadius: '6px', width: '100%', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={uploadForm.requiresSignature}
                  onChange={(e) => setUploadForm({ ...uploadForm, requiresSignature: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#00ff88' }}
                />
                <span style={{ fontSize: '13px', color: '#ccc' }}>Requires signature (DocuSign)</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #1a1a1a' }}>
              <button onClick={uploadDocument} disabled={uploading || !selectedFile} className="btn-primary btn-block">
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
              <button onClick={() => { setShowUploadModal(false); setSelectedFile(null); }} className="btn-secondary btn-block">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealDocumentsTab;
