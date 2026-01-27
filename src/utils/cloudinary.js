// Cloudinary Configuration
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

// Delete image from Cloudinary (requires server-side with API secret)
// For now, we'll just remove from our database
export const deleteFromCloudinary = async (publicId) => {
  console.warn('Delete requires server-side implementation with API secret');
  // TODO: Implement server-side delete endpoint
  return true;
};
