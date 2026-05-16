import { PutObjectCommand, DeleteObjectsCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '../lib/r2';

export const storageService = {
  /**
   * Upload a file to R2
   * @param {string} path - The destination path in the bucket
   * @param {File | Blob} file - The file to upload
   * @returns {Promise<{path: string, url: string}>}
   */
  async upload(path, file) {
    try {
      console.log('Starting R2 upload for:', path);
      
      // Convert File/Blob to Uint8Array for better compatibility in browser environments
      const arrayBuffer = await file.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: path,
        Body: body,
        ContentType: file.type,
      });

      await r2Client.send(command);
      console.log('R2 upload successful:', path);
      
      const url = this.getPublicUrl(path);
      return { path, url };
    } catch (error) {
      console.error('R2 Upload Error Detailed:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        path: path,
        bucket: R2_BUCKET_NAME
      });
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Upload failed. This is likely a CORS issue. Please ensure your R2 bucket CORS policy allows this domain.');
      }
      
      throw error;
    }
  },

  /**
   * Delete one or more files from R2
   * @param {string | string[]} paths - The path(s) to delete
   */
  async delete(paths) {
    try {
      if (Array.isArray(paths)) {
        if (paths.length === 0) return;
        
        const command = new DeleteObjectsCommand({
          Bucket: R2_BUCKET_NAME,
          Delete: {
            Objects: paths.map(path => ({ Key: path })),
          },
        });
        await r2Client.send(command);
      } else {
        const command = new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: paths,
        });
        await r2Client.send(command);
      }
    } catch (error) {
      console.error('R2 Delete Error:', error);
      throw error;
    }
  },

  /**
   * Get the public URL for a file
   * @param {string} path - The path in the bucket
   * @returns {string}
   */
  getPublicUrl(path) {
    if (!R2_PUBLIC_URL) {
      console.warn('VITE_R2_PUBLIC_URL is not defined');
      return path; // Fallback
    }
    // If public URL doesn't have a trailing slash, add one
    const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : `${R2_PUBLIC_URL}/`;
    return `${baseUrl}${path}`;
  }
};
