# Cloudinary Image Storage Integration

This implementation provides a flexible, optimized image storage solution using Cloudinary. The code is designed to allow for a smooth transition from Supabase Storage to Cloudinary while maintaining backward compatibility.

## Setup Instructions

1. **Add Environment Variables**
   
   Add the following to your `.env` file:

   ```
   # Image Storage Configuration
   STORAGE_PROVIDER=cloudinary
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

   You can get these values from your Cloudinary dashboard after creating an account.

2. **Switching Storage Providers**

   - To use Cloudinary: Set `STORAGE_PROVIDER=cloudinary` in your `.env` file
   - To revert to Supabase: Set `STORAGE_PROVIDER=supabase` in your `.env` file

## Migration Process

To migrate existing images from Supabase to Cloudinary:

1. Make sure your Cloudinary credentials are properly set in `.env`
2. Run the migration script:

   ```bash
   node src/utils/storage/migrateToCloadinary.js
   ```

3. Verify all images were successfully migrated by checking your Cloudinary dashboard

## Code Structure

- `src/config/cloudinary.js` - Cloudinary configuration
- `src/utils/storage/cloudinaryStorage.js` - Core Cloudinary operations
- `src/utils/storage/imageStorageAdapter.js` - Adapter to switch between storage providers
- `src/utils/storage/migrateToCloadinary.js` - Migration script

## Using Cloudinary Features

### Backend

All image operations remain the same in your controllers - they work through the adapter layer which transparently uses either Supabase or Cloudinary based on your configuration.

### Frontend Optimization

Use the new frontend utilities for optimized image delivery:

```typescript
import { optimizeCloudinaryImage, generateSrcSet } from '@/app/utils/cloudinaryImage';

// Basic optimization
const optimizedUrl = optimizeCloudinaryImage(imageUrl, { 
  width: 800, 
  height: 600, 
  quality: 'auto' 
});

// Responsive images
const srcSet = generateSrcSet(imageUrl);
```

## Benefits of Cloudinary

1. **Automatic optimization** - Images are automatically optimized for the web
2. **On-the-fly transformations** - Resize, crop, and transform images via URL parameters
3. **Global CDN** - Fast image delivery worldwide
4. **Better mobile support** - Automatic device-based optimizations
5. **Advanced features** - Face detection, auto-tagging, AI-powered optimizations

## Troubleshooting

- If images aren't appearing, check your Cloudinary dashboard to verify uploads
- Ensure your environment variables are correctly set
- Check server logs for any upload or transformation errors

For more information, visit [Cloudinary Documentation](https://cloudinary.com/documentation).
