'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Redemption } from '@/lib/types/database'
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateQRCode } from '@/lib/utils/qr-code'
import { formatDateTime } from '@/lib/utils/format'
import Image from 'next/image'

export default function RedemptionPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [redemption, setRedemption] = useState<Redemption | null>(null)
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRedemption()
    
    // Subscribe to redemption updates
    const channel = supabase
      .channel('redemption-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'redemptions',
          filter: `redemption_code=eq.${code}`,
        },
        (payload) => {
          setRedemption(payload.new as Redemption)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [code])

  async function loadRedemption() {
    try {
      const { data, error } = await supabase
        .from('redemptions')
        .select('*')
        .eq('redemption_code', code)
        .single()

      if (error) throw error

      setRedemption(data)

      // Generate QR code
      const qr = await generateQRCode(code)
      setQrCode(qr)
    } catch (error) {
      console.error('Error loading redemption:', error)
      toast.error('Redemption not found')
      router.push('/customer')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!redemption) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/customer')}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold">Redemption</h1>
        </div>
      </div>

      <div className="px-6 py-8">
        {/* Status Badge */}
        <div className="mb-6">
          {redemption.status === 'pending' && (
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-4 rounded-lg">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">Waiting for verification</span>
            </div>
          )}
          {redemption.status === 'verified' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Verified!</span>
            </div>
          )}
          {redemption.status === 'cancelled' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
              <XCircle className="h-5 w-5" />
              <span className="font-semibold">Cancelled</span>
            </div>
          )}
        </div>

        {/* QR Code */}
        {redemption.status === 'pending' && (
          <div className="card text-center mb-6">
            <h2 className="text-xl font-semibold mb-4">Show this to staff</h2>
            {qrCode && (
              <div className="bg-white p-4 rounded-lg inline-block">
                <Image
                  src={qrCode}
                  alt="QR Code"
                  width={300}
                  height={300}
                  className="mx-auto"
                />
              </div>
            )}
            <p className="text-2xl font-mono font-bold mt-4 text-primary">
              {redemption.redemption_code}
            </p>
          </div>
        )}

        {/* Redemption Details */}
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Reward Details</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Reward</p>
              <p className="font-semibold">{redemption.reward_title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cost</p>
              <p className="font-semibold">
                {redemption.stamps_used > 0
                  ? `${redemption.stamps_used} stamps`
                  : `${redemption.points_used} points`}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Requested</p>
              <p className="font-semibold">{formatDateTime(redemption.created_at)}</p>
            </div>
            {redemption.verified_at && (
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="font-semibold">{formatDateTime(redemption.verified_at)}</p>
              </div>
            )}
          </div>
        </div>

        {redemption.status === 'verified' && (
          <button
            onClick={() => router.push('/customer')}
            className="btn-primary w-full mt-6"
          >
            Back to Home
          </button>
        )}
      </div>
    </div>
  )
}
