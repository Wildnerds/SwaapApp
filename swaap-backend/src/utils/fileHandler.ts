// src/utils/fileHandler.ts
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileHandler {
  static async ensureUploadDir(userId: string) {
    const uploadDir = path.join(__dirname, '../../uploads/identity-docs', userId);
    await fs.mkdir(uploadDir, { recursive: true });
    return uploadDir;
  }

  static async deleteFile(filePath: string) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }

  static async deleteUserFiles(userId: string) {
    try {
      const userDir = path.join(__dirname, '../../uploads/identity-docs', userId);
      await fs.rmdir(userDir, { recursive: true });
      return true;
    } catch (error) {
      console.error('Failed to delete user files:', error);
      return false;
    }
  }

  static getFileUrl(userId: string, filename: string) {
    return `/uploads/identity-docs/${userId}/${filename}`;
  }

  static async getFileInfo(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      return null;
    }
  }
}