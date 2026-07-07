// Cloudinary Configuration
import { auth } from '../firebase';

export const CLOUDINARY_CLOUD_NAME = 'dcirl3j3v';
export const CLOUDINARY_UPLOAD_PRESET = 'rems_unsigned'; // We'll create this in Cloudinary

// Upload image to Cloudinary
export const uploadToCloudinary = async (file, folder = 'properties') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

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
      width: data.width,
      height: data.height
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Upload multiple images
export const uploadMultipleToCloudinary = async (files, folder = 'properties') => {
  const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
  return Promise.all(uploadPromises);
};

export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return true;
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Sign in again to delete media');
  }

  const response = await fetch('/api/delete-media', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ publicId, resourceType })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Media delete failed');
  }
  return true;
};
