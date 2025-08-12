// src/config/cloudinaryUploader.ts

import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// Multer middleware for handling multiple images
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific image formats
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedFormats.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, and PNG files are allowed!'));
    }
  },
});

// Upload buffer to Cloudinary with transformations
export const uploadToCloudinary = (
  buffer: Buffer,
  originalname: string,
  options: {
    folder?: string;
    width?: number;
    height?: number;
    crop?: string;
  } = {}
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const publicId = `${Date.now()}-${originalname}`;
    
    cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'products',
        public_id: publicId,
        resource_type: 'image',
        transformation: [
          {
            width: options.width || 800,
            height: options.height || 800,
            crop: options.crop || 'limit'
          }
        ],
        format: 'jpg', // Convert to jpg for consistency
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

// Helper function for single file upload
export const uploadSingle = async (file: Express.Multer.File, folder = 'products') => {
  return uploadToCloudinary(file.buffer, file.originalname, { folder });
};

// Helper function for multiple file uploads
export const uploadMultiple = async (files: Express.Multer.File[], folder = 'products') => {
  const uploadPromises = files.map(file => 
    uploadToCloudinary(file.buffer, file.originalname, { folder })
  );
  return Promise.all(uploadPromises);
};

export { upload };