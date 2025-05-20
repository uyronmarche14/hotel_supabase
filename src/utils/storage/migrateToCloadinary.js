/**
 * Migration Script to move images from Supabase Storage to Cloudinary
 * 
 * This script fetches all rooms and users from the database,
 * downloads their images from Supabase, and uploads them to Cloudinary
 * 
 * Usage: 
 * 1. Set STORAGE_PROVIDER=cloudinary in .env
 * 2. Run this script with: node src/utils/storage/migrateToCloadinary.js
 */

require('dotenv').config();
const axios = require('axios');
const { supabaseClient } = require('../../config/supabase');
const cloudinaryStorage = require('./cloudinaryStorage');
const AppError = require('../appError');

/**
 * Download image from URL
 * @param {string} url - The URL to download from
 * @returns {Promise<Buffer>} - Downloaded image as buffer
 */
const downloadImage = async (url) => {
  try {
    if (!url || !url.startsWith('http')) return null;
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer'
    });
    
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error(`Failed to download image from ${url}:`, error.message);
    return null;
  }
};

/**
 * Migrate all room images to Cloudinary
 */
const migrateRoomImages = async () => {
  console.log('Starting room images migration...');
  
  try {
    // Get all rooms with images
    const { data: rooms, error } = await supabaseClient
      .from('rooms')
      .select('id, title, image_url, images')
      .order('id');
    
    if (error) throw new Error(`Failed to fetch rooms: ${error.message}`);
    
    console.log(`Found ${rooms.length} rooms to process`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const room of rooms) {
      console.log(`Processing room ${room.id} - ${room.title}`);
      
      // Process main image
      if (room.image_url && !room.image_url.includes('cloudinary.com')) {
        try {
          const imageBuffer = await downloadImage(room.image_url);
          
          if (imageBuffer) {
            // Extract file name and content type
            const fileName = room.image_url.split('/').pop() || 'main.jpg';
            const contentType = 'image/jpeg'; // Default to JPEG
            
            // Upload to Cloudinary
            const newImageUrl = await cloudinaryStorage.uploadRoomImage(
              room.id, 
              imageBuffer, 
              fileName, 
              contentType
            );
            
            // Update database with new URL
            const { error: updateError } = await supabaseClient
              .from('rooms')
              .update({ image_url: newImageUrl })
              .eq('id', room.id);
            
            if (updateError) {
              throw new Error(`Failed to update room with new image URL: ${updateError.message}`);
            }
            
            console.log(`  ✓ Migrated main image: ${newImageUrl}`);
            successCount++;
          } else {
            console.log(`  ⚠ Failed to download main image, skipping`);
            skipCount++;
          }
        } catch (error) {
          console.error(`  ✗ Error migrating main image:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`  ⚠ Main image already on Cloudinary or missing, skipping`);
        skipCount++;
      }
      
      // Process additional images array
      if (room.images && Array.isArray(room.images) && room.images.length > 0) {
        const newImages = [...room.images];
        let changed = false;
        
        for (let i = 0; i < room.images.length; i++) {
          const imageUrl = room.images[i];
          
          if (imageUrl && !imageUrl.includes('cloudinary.com')) {
            try {
              const imageBuffer = await downloadImage(imageUrl);
              
              if (imageBuffer) {
                // Extract file name and content type
                const fileName = imageUrl.split('/').pop() || `image_${i}.jpg`;
                const contentType = 'image/jpeg'; // Default to JPEG
                
                // Upload to Cloudinary
                const newImageUrl = await cloudinaryStorage.uploadRoomImage(
                  room.id, 
                  imageBuffer, 
                  fileName, 
                  contentType
                );
                
                // Update array with new URL
                newImages[i] = newImageUrl;
                changed = true;
                
                console.log(`  ✓ Migrated additional image ${i+1}: ${newImageUrl}`);
                successCount++;
              } else {
                console.log(`  ⚠ Failed to download additional image ${i+1}, keeping original URL`);
                skipCount++;
              }
            } catch (error) {
              console.error(`  ✗ Error migrating additional image ${i+1}:`, error.message);
              errorCount++;
            }
          } else {
            console.log(`  ⚠ Additional image ${i+1} already on Cloudinary or invalid, skipping`);
            skipCount++;
          }
        }
        
        // Update database with new image array if changed
        if (changed) {
          const { error: updateError } = await supabaseClient
            .from('rooms')
            .update({ images: newImages })
            .eq('id', room.id);
          
          if (updateError) {
            console.error(`  ✗ Failed to update room with new image array: ${updateError.message}`);
            errorCount++;
          } else {
            console.log(`  ✓ Updated room with ${newImages.length} migrated images`);
          }
        }
      }
      
      console.log(`Finished processing room ${room.id}`);
      console.log('--------------------------------------------------');
    }
    
    console.log('\nRoom Migration Summary:');
    console.log(`  ✓ Successfully migrated: ${successCount} images`);
    console.log(`  ⚠ Skipped: ${skipCount} images`);
    console.log(`  ✗ Errors: ${errorCount} images`);
    
    return { successCount, skipCount, errorCount };
  } catch (error) {
    console.error('Failed to migrate room images:', error);
    throw error;
  }
};

/**
 * Migrate all user profile images to Cloudinary
 */
const migrateProfileImages = async () => {
  console.log('\nStarting profile images migration...');
  
  try {
    // Get all users with profile images
    const { data: users, error } = await supabaseClient
      .from('users')
      .select('id, email, profile_image')
      .order('id');
    
    if (error) throw new Error(`Failed to fetch users: ${error.message}`);
    
    console.log(`Found ${users.length} users to process`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      console.log(`Processing user ${user.id} - ${user.email}`);
      
      // Process profile image
      if (user.profile_image && !user.profile_image.includes('cloudinary.com')) {
        try {
          const imageBuffer = await downloadImage(user.profile_image);
          
          if (imageBuffer) {
            // Extract file name and content type
            const fileName = user.profile_image.split('/').pop() || 'profile.jpg';
            const contentType = 'image/jpeg'; // Default to JPEG
            
            // Upload to Cloudinary
            const newImageUrl = await cloudinaryStorage.uploadProfilePicture(
              user.id, 
              imageBuffer, 
              fileName, 
              contentType
            );
            
            // Update database with new URL
            const { error: updateError } = await supabaseClient
              .from('users')
              .update({ profile_image: newImageUrl })
              .eq('id', user.id);
            
            if (updateError) {
              throw new Error(`Failed to update user with new profile image: ${updateError.message}`);
            }
            
            console.log(`  ✓ Migrated profile image: ${newImageUrl}`);
            successCount++;
          } else {
            console.log(`  ⚠ Failed to download profile image, skipping`);
            skipCount++;
          }
        } catch (error) {
          console.error(`  ✗ Error migrating profile image:`, error.message);
          errorCount++;
        }
      } else {
        console.log(`  ⚠ Profile image already on Cloudinary or missing, skipping`);
        skipCount++;
      }
      
      console.log(`Finished processing user ${user.id}`);
      console.log('--------------------------------------------------');
    }
    
    console.log('\nProfile Migration Summary:');
    console.log(`  ✓ Successfully migrated: ${successCount} images`);
    console.log(`  ⚠ Skipped: ${skipCount} images`);
    console.log(`  ✗ Errors: ${errorCount} images`);
    
    return { successCount, skipCount, errorCount };
  } catch (error) {
    console.error('Failed to migrate profile images:', error);
    throw error;
  }
};

/**
 * Main migration function
 */
const migrate = async () => {
  console.log('======================================================');
  console.log('STARTING MIGRATION FROM SUPABASE TO CLOUDINARY');
  console.log('======================================================');
  
  try {
    const roomResults = await migrateRoomImages();
    const profileResults = await migrateProfileImages();
    
    console.log('\n======================================================');
    console.log('MIGRATION COMPLETE');
    console.log('======================================================');
    console.log('\nTotal Migration Summary:');
    console.log(`  ✓ Successfully migrated: ${roomResults.successCount + profileResults.successCount} images`);
    console.log(`  ⚠ Skipped: ${roomResults.skipCount + profileResults.skipCount} images`);
    console.log(`  ✗ Errors: ${roomResults.errorCount + profileResults.errorCount} images`);
    console.log('\nNOTE: Be sure to check your Cloudinary dashboard to confirm all images were migrated successfully');
  } catch (error) {
    console.error('\n======================================================');
    console.error('MIGRATION FAILED');
    console.error('======================================================');
    console.error(error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrate().catch(console.error);
}

module.exports = {
  migrate,
  migrateRoomImages,
  migrateProfileImages
};
