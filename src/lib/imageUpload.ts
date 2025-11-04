import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a single image to Firebase Storage
 * @param file - The image file to upload
 * @param folder - The folder path in storage (e.g., 'products')
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns Promise<string> - The download URL of the uploaded image
 */
export const uploadImage = async (
  file: File,
  folder: string = 'products',
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 5MB');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = file.name.split('.').pop();
  const filename = `${timestamp}_${randomString}.${extension}`;

  // Create storage reference
  const storageRef = ref(storage, `${folder}/${filename}`);

  // Upload file
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Calculate progress percentage
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        // Handle upload errors
        console.error('Upload error:', error);
        reject(new Error('Failed to upload image'));
      },
      async () => {
        // Upload completed successfully, get download URL
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error('Error getting download URL:', error);
          reject(new Error('Failed to get image URL'));
        }
      }
    );
  });
};

/**
 * Uploads multiple images to Firebase Storage
 * @param files - Array of image files to upload
 * @param folder - The folder path in storage
 * @param onProgress - Optional callback for overall progress (0-100)
 * @returns Promise<string[]> - Array of download URLs
 */
export const uploadMultipleImages = async (
  files: File[],
  folder: string = 'products',
  onProgress?: (progress: number) => void
): Promise<string[]> => {
  const uploadPromises = files.map((file, index) => {
    return uploadImage(file, folder, (fileProgress) => {
      if (onProgress) {
        // Calculate overall progress
        const overallProgress = ((index + fileProgress / 100) / files.length) * 100;
        onProgress(overallProgress);
      }
    });
  });

  try {
    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw new Error('Failed to upload one or more images');
  }
};

/**
 * Deletes an image from Firebase Storage
 * @param imageUrl - The full download URL of the image to delete
 * @returns Promise<void>
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract the path from the URL
    // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const urlParts = imageUrl.split('/o/');
    if (urlParts.length < 2) {
      console.warn('Invalid Firebase Storage URL format');
      return;
    }

    const pathWithParams = urlParts[1];
    const path = decodeURIComponent(pathWithParams.split('?')[0]);

    const imageRef = ref(storage, path);
    await deleteObject(imageRef);
  } catch (error) {
    // Silently fail if image doesn't exist or can't be deleted
    console.warn('Failed to delete image:', error);
  }
};

/**
 * Validates if a file is an image and within size limits
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default: 5)
 * @returns Object with isValid and error message
 */
export const validateImageFile = (
  file: File,
  maxSizeMB: number = 5
): { isValid: boolean; error?: string } => {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' };
  }

  // Check file size
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: `Image size must be less than ${maxSizeMB}MB` };
  }

  // Check for valid image extensions
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !validExtensions.includes(extension)) {
    return {
      isValid: false,
      error: 'Invalid image format. Supported: JPG, PNG, GIF, WebP'
    };
  }

  return { isValid: true };
};
