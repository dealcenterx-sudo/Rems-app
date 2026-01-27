import React, { useState } from 'react';
import { uploadToCloudinary, uploadMultipleToCloudinary } from '../utils/cloudinary';

// Simple Upload Icon
const UploadIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ImageUpload = ({ 
  onUploadComplete, 
  multiple = false, 
  folder = 'properties',
  maxFiles = 10,
  existingImages = []
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState(existingImages);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Check max files
    if (uploadedImages.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} images allowed`);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let results;
      
      if (multiple) {
        results = await uploadMultipleToCloudinary(files, folder);
      } else {
        const result = await uploadToCloudinary(files[0], folder);
        results = [result];
      }

      const newImages = [...uploadedImages, ...results];
      setUploadedImages(newImages);
      
      if (onUploadComplete) {
        onUploadComplete(multiple ? newImages : results[0]);
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    
    if (onUploadComplete) {
      onUploadComplete(multiple ? newImages : null);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Upload Button */}
      <label 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px 20px',
          background: uploading ? '#1a1a1a' : '#0a0a0a',
          border: '2px dashed #00ff88',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          color: '#00ff88',
          fontSize: '13px',
          fontWeight: '600',
          fontFamily: 'inherit'
        }}
        onMouseEnter={(e) => {
          if (!uploading) e.currentTarget.style.background = '#0f0f0f';
        }}
        onMouseLeave={(e) => {
          if (!uploading) e.currentTarget.style.background = '#0a0a0a';
        }}
      >
        <UploadIcon size={20} />
        {uploading ? 'Uploading...' : `Upload ${multiple ? 'Images' : 'Image'}`}
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          background: '#ff333315',
          border: '1px solid #ff3333',
          borderRadius: '4px',
          color: '#ff3333',
          fontSize: '12px'
        }}>
          {error}
        </div>
      )}

      {/* Uploaded Images Preview */}
      {uploadedImages.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '10px',
          marginTop: '15px'
        }}>
          {uploadedImages.map((image, index) => (
            <div
              key={index}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #1a1a1a'
              }}
            >
              <img
                src={image.url}
                alt={`Upload ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              
              {/* Remove Button */}
              <button
                onClick={() => handleRemoveImage(index)}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  background: '#ff3333',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff'
                }}
              >
                <XIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
