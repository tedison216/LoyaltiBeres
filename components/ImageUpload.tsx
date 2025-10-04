'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { uploadImage, deleteImage, validateImageDimensions, ImageUploadResult, ImageUploadError } from '@/lib/utils/image-upload'
import toast from 'react-hot-toast'

interface ImageUploadProps {
  value?: string
  onChange: (url: string | null) => void
  onUpload?: (result: ImageUploadResult) => void
  bucket?: string
  folder?: string
  className?: string
  maxSize?: number // in MB
  acceptedTypes?: string[]
  disabled?: boolean
  showPreview?: boolean
  previewSize?: { width: number; height: number }
}

export default function ImageUpload({
  value,
  onChange,
  onUpload,
  bucket = 'restaurant-assets',
  folder,
  className = '',
  maxSize = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  disabled = false,
  showPreview = true,
  previewSize = { width: 120, height: 120 }
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setPreviewError(null)
    setUploading(true)

    try {
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        throw new Error(`File size must be less than ${maxSize}MB`)
      }

      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please select a JPEG, PNG, or WebP image.')
      }

      // Validate dimensions (optional - you can adjust these limits)
      const dimensionValidation = await validateImageDimensions(file, 100, 100, 2000, 2000)
      if (!dimensionValidation.valid) {
        throw new Error(dimensionValidation.error)
      }

      const result = await uploadImage(file, bucket, folder)

      if ('message' in result) {
        throw new Error(result.message)
      }

      onChange(result.url)
      onUpload?.(result)
      toast.success('Image uploaded successfully!')
    } catch (error: any) {
      console.error('Upload error:', error)
      setPreviewError(error.message || 'Failed to upload image')
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    if (!value) return

    try {
      // Extract path from URL (this is a simplified approach)
      // In a real app, you'd want to store the path separately or parse it from the URL
      const urlParts = value.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const path = folder ? `${folder}/${fileName}` : fileName

      await deleteImage(path, bucket)
      onChange(null)
      toast.success('Image removed successfully!')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to remove image')
    }
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />

      {/* Upload area */}
      <div
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${disabled || uploading
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-primary bg-gray-50 hover:bg-gray-100'
          }
          ${previewSize.width < 200 ? 'p-4' : 'p-8'}
        `}
      >
        {uploading ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : value && showPreview ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <Image
                src={value}
                alt="Preview"
                width={previewSize.width}
                height={previewSize.height}
                className="rounded-lg object-cover"
                onError={() => setPreviewError('Failed to load image')}
              />
              {!disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove()
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600">Click to change image</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <ImageIcon className="h-12 w-12 text-gray-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">
                {value ? 'Change image' : 'Upload image'}
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, WebP up to {maxSize}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {previewError && (
        <p className="text-sm text-red-600">{previewError}</p>
      )}
    </div>
  )
}
