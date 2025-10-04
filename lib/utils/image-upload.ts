import { supabase } from '@/lib/supabase/client'

export interface ImageUploadResult {
  url: string
  path: string
}

export interface ImageUploadError {
  message: string
  code?: string
}

/**
 * Upload an image to Supabase Storage
 * @param file - The image file to upload
 * @param bucket - The storage bucket name (defaults to 'restaurant-assets')
 * @param folder - Optional folder path within the bucket
 * @returns Promise<ImageUploadResult | ImageUploadError>
 */
export async function uploadImage(
  file: File,
  bucket: string = 'restaurant-assets',
  folder?: string
): Promise<ImageUploadResult | ImageUploadError> {
  try {
    // Validate file type
    if (!isValidImageType(file)) {
      return { message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' }
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return { message: 'File size must be less than 5MB.' }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = folder ? `${folder}/${fileName}` : fileName

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { message: error.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('Upload error:', error)
    return { message: 'Failed to upload image. Please try again.' }
  }
}

/**
 * Delete an image from Supabase Storage
 * @param path - The file path to delete
 * @param bucket - The storage bucket name (defaults to 'restaurant-assets')
 * @returns Promise<boolean>
 */
export async function deleteImage(
  path: string,
  bucket: string = 'restaurant-assets'
): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

/**
 * Validate if file is a supported image type
 */
function isValidImageType(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  return allowedTypes.includes(file.type)
}

/**
 * Get image dimensions for validation
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Validate image dimensions (optional - for ensuring minimum/maximum sizes)
 */
export async function validateImageDimensions(
  file: File,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { width, height } = await getImageDimensions(file)

    if (minWidth && width < minWidth) {
      return { valid: false, error: `Image width must be at least ${minWidth}px` }
    }

    if (minHeight && height < minHeight) {
      return { valid: false, error: `Image height must be at least ${minHeight}px` }
    }

    if (maxWidth && width > maxWidth) {
      return { valid: false, error: `Image width must be no more than ${maxWidth}px` }
    }

    if (maxHeight && height > maxHeight) {
      return { valid: false, error: `Image height must be no more than ${maxHeight}px` }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Failed to validate image dimensions' }
  }
}
