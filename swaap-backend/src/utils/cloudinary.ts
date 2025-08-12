// src/utils/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

// Configure cloudinary (make sure you have these env variables)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (fileBuffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: 'profile-photos',
        transformation: [
          { width: 400, height: 400, crop: 'fill' },
          { quality: 'auto' }
        ]
      }, 
      (err, result) => {
        if (err || !result) return reject(err);
        resolve(result.secure_url);
      }
    );

    uploadStream.end(fileBuffer);
  });
};