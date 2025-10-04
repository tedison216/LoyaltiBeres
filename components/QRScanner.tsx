'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, IScannerControls, BrowserQRCodeReader } from '@zxing/browser'
import { Result } from '@zxing/library'
import { QrCode } from 'lucide-react'

interface QRScannerProps {
  onResult: (value: string) => void
  onClose: () => void
  title?: string
  description?: string
  deviceId?: string
}

export function QRScanner({ onResult, onClose, title = 'Scan QR Code', description, deviceId }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const hasScannedRef = useRef(false)
  const imageReaderRef = useRef<BrowserQRCodeReader | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDecodingPhoto, setIsDecodingPhoto] = useState(false)
  const [canStream, setCanStream] = useState(true)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    hasScannedRef.current = false

    async function initScanner() {
      setError(null)
      setCanStream(true)

      if (typeof window === 'undefined') {
        setError('Camera can only be accessed in the browser environment')
        return
      }

      const navAny = navigator as any

      if (!navAny.mediaDevices) {
        navAny.mediaDevices = {}
      }

      if (!navAny.mediaDevices.getUserMedia) {
        const legacyGetUserMedia =
          navAny.getUserMedia || navAny.webkitGetUserMedia || navAny.mozGetUserMedia || navAny.msGetUserMedia

        if (legacyGetUserMedia) {
          navAny.mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) =>
            new Promise((resolve, reject) => legacyGetUserMedia.call(navAny, constraints, resolve, reject))
        }
      }

      const getUserMedia: ((constraints: MediaStreamConstraints) => Promise<MediaStream>) | undefined =
        navAny.mediaDevices?.getUserMedia?.bind(navAny.mediaDevices)

      if (!getUserMedia) {
        setCanStream(false)
        setError('Live camera preview is not supported here. Use the Capture Photo option instead.')
        return
      }

      const videoElement = videoRef.current

      if (!videoElement) {
        setError('Camera element is not ready yet. Please try again.')
        return
      }

      try {
        const constraints: MediaStreamConstraints = deviceId
          ? {
              video: {
                deviceId: { exact: deviceId },
                facingMode: { ideal: 'environment' },
              },
            }
          : {
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            }

        const controls = await reader.decodeFromConstraints(
          constraints,
          videoElement,
          (result: Result | undefined) => {
            if (result && !hasScannedRef.current) {
              const value = result.getText()
              handleDetectedValue(value)
            }
          }
        )
        controlsRef.current = controls
      } catch (err: any) {
        console.error('QR scanner error', err)
        if (err?.name === 'NotAllowedError') {
          setError('Camera permission was denied. Please allow access and try again.')
        } else if (err?.name === 'NotReadableError') {
          setError('Camera is already in use by another application.')
        } else if (err?.message?.toLowerCase().includes('secure context')) {
          setCanStream(false)
          setError('Camera requires HTTPS or localhost. Use a secure connection or Capture Photo fallback.')
        } else if (err?.name === 'NotSupportedError') {
          setCanStream(false)
          setError('Live camera preview not supported. Try the Capture Photo option instead.')
        } else {
          setError(err?.message || 'Failed to access camera')
        }
      }
    }

    initScanner()

    return () => {
      cleanupReader()
    }
  }, [onResult, deviceId])

  function cleanupReader() {
    hasScannedRef.current = true
    controlsRef.current?.stop()
    controlsRef.current = null

    const reader = readerRef.current as any
    if (reader) {
      if (typeof reader.stopContinuousDecode === 'function') {
        reader.stopContinuousDecode()
      }
      if (typeof reader.reset === 'function') {
        reader.reset()
      }
    }
  }

  function handleDetectedValue(value: string) {
    if (hasScannedRef.current) return
    hasScannedRef.current = true
    cleanupReader()
    onResult(value)
  }

  async function handleCaptureFrame() {
    if (isDecodingPhoto) return
    if (!canStream) {
      triggerPhotoCapture()
      return
    }

    const video = videoRef.current
    if (!video) {
      setError('Camera is not ready yet. Please wait a moment and try again.')
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      setError('Unable to access camera frame. Please try again.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      setError('Unable to capture image from camera.')
      return
    }

    setIsDecodingPhoto(true)
    setError(null)

    try {
      context.imageSmoothingEnabled = false
      context.drawImage(video, 0, 0, width, height)

      const imageReader = imageReaderRef.current ?? new BrowserQRCodeReader()
      imageReaderRef.current = imageReader

      let result: Result | null = null
      try {
        result = await imageReader.decodeFromCanvas(canvas)
      } catch (canvasError) {
        const dataUrl = canvas.toDataURL('image/png')
        const img = new Image()
        img.src = dataUrl

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Failed to process captured image'))
        })

        result = await imageReader.decodeFromImageElement(img)
      }

      if (result) {
        handleDetectedValue(result.getText())
      } else {
        setError('No QR code detected. Try holding the QR closer and capture again.')
      }
    } catch (err: any) {
      console.error('QR decode from captured frame failed', err)
      setError(err?.message || 'Failed to decode QR code from captured image')
    } finally {
      setIsDecodingPhoto(false)
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setIsDecodingPhoto(true)
    setError(null)

    try {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.src = url

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to process captured image'))
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Unable to process captured photo.')
      }

      context.imageSmoothingEnabled = false
      context.drawImage(img, 0, 0, canvas.width, canvas.height)

      const imageReader = imageReaderRef.current ?? new BrowserQRCodeReader()
      imageReaderRef.current = imageReader

      let result: Result | null = null

      try {
        result = await imageReader.decodeFromCanvas(canvas)
      } catch (canvasError) {
        result = await imageReader.decodeFromImageElement(img)
      }

      if (result) {
        handleDetectedValue(result.getText())
      } else {
        setError('No QR code detected. Try capturing the code more clearly.')
      }

      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('QR decode from captured photo failed', err)
      setError(err?.message || 'Failed to decode QR code from captured photo')
    } finally {
      setIsDecodingPhoto(false)
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  function triggerPhotoCapture() {
    fileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 relative">
        <button
          onClick={() => {
            onClose()
          }}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close scanner"
        >
          ✕
        </button>

        <div className="space-y-1 text-center">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {description && <p className="text-sm text-gray-600">{description}</p>}
        </div>

        <div className="aspect-square rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center relative">
          {canStream ? (
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          ) : (
            <div className="flex flex-col items-center justify-center text-center px-4">
              <QrCode className="h-12 w-12 text-white/60 mb-3" />
              <p className="text-sm text-white/80">
                Live preview unavailable. Use the capture button below to scan a QR code.
              </p>
            </div>
          )}
          {error && (
            <span className="absolute bottom-2 left-3 right-3 text-xs text-red-400 bg-black/60 rounded-md px-2 py-1 text-center">
              {error}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {canStream && (
            <button
              onClick={handleCaptureFrame}
              className="w-full sm:w-auto btn-secondary"
              type="button"
              disabled={isDecodingPhoto}
            >
              {isDecodingPhoto ? 'Processing…' : 'Capture Frame'}
            </button>
          )}
          <button
            onClick={triggerPhotoCapture}
            className="w-full sm:w-auto btn-primary"
            type="button"
            disabled={isDecodingPhoto}
          >
            {isDecodingPhoto ? 'Processing…' : 'Capture Photo'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <p className="text-xs text-gray-500 text-center">
          Align the customer's QR code within the frame. Capture a photo if live preview is unavailable.
        </p>
      </div>
    </div>
  )
}
