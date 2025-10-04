'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant, Reward } from '@/lib/types/database'
import { ArrowLeft, Gift, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateRedemptionCode } from '@/lib/utils/qr-code'
import Image from 'next/image'

export default function RewardsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [todayRedemptions, setTodayRedemptions] = useState(0)
  const [maxRedemptions, setMaxRedemptions] = useState(3)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!profileData) {
        toast.error('Profile not found')
        return
      }

      setProfile(profileData)

      // Load restaurant
      if (profileData.restaurant_id) {
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', profileData.restaurant_id)
          .single()

        if (restaurantData) {
          setRestaurant(restaurantData)
          setMaxRedemptions(restaurantData.max_redemptions_per_day || 3)
        }

        // Load rewards
        const { data: rewardsData } = await supabase
          .from('rewards')
          .select('*')
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('is_active', true)
          .order('required_points', { ascending: true, nullsFirst: false })
          .order('required_stamps', { ascending: true, nullsFirst: false })

        if (rewardsData) {
          setRewards(rewardsData)
        }

        // Check today's redemptions
        const today = new Date().toISOString().split('T')[0]
        const { data: redemptionsData } = await supabase
          .from('redemptions')
          .select('*')
          .eq('customer_id', profileData.id)
          .eq('restaurant_id', profileData.restaurant_id)
          .gte('created_at', today)
          .in('status', ['pending', 'verified'])

        setTodayRedemptions(redemptionsData?.length || 0)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }

  async function handleRedeem(reward: Reward) {
    if (!profile || !restaurant) return

    // Check redemption limit
    if (todayRedemptions >= maxRedemptions) {
      toast.error(`You have reached the maximum redemptions for today (${maxRedemptions})`)
      return
    }

    const isStampMode = restaurant.loyalty_mode === 'stamps'
    const requiredAmount = isStampMode ? reward.required_stamps : reward.required_points
    const currentBalance = isStampMode ? profile.stamps : profile.points

    if (!requiredAmount || currentBalance < requiredAmount) {
      toast.error(`Insufficient ${isStampMode ? 'stamps' : 'points'}`)
      return
    }

    try {
      const redemptionCode = generateRedemptionCode()

      const { error } = await supabase.from('redemptions').insert({
        restaurant_id: restaurant.id,
        customer_id: profile.id,
        reward_id: reward.id,
        reward_title: reward.title,
        points_used: isStampMode ? 0 : requiredAmount,
        stamps_used: isStampMode ? requiredAmount : 0,
        redemption_code: redemptionCode,
        status: 'pending',
      })

      if (error) throw error

      toast.success('Reward redeemed! Show the QR code to staff.')
      router.push(`/customer/redemption/${redemptionCode}`)
    } catch (error: any) {
      console.error('Error redeeming reward:', error)
      toast.error(error.message || 'Failed to redeem reward')
    }
  }

  function canRedeem(reward: Reward): boolean {
    if (!profile || !restaurant) return false

    const isStampMode = restaurant.loyalty_mode === 'stamps'
    const requiredAmount = isStampMode ? reward.required_stamps : reward.required_points
    const currentBalance = isStampMode ? profile.stamps : profile.points

    return !!requiredAmount && currentBalance >= requiredAmount
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold">Available Rewards</h1>
        </div>

        {/* Balance Display */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <p className="text-sm opacity-90 mb-1">Your Balance</p>
          <div className="flex items-end gap-2">
            {restaurant?.loyalty_mode === 'stamps' ? (
              <>
                <span className="text-3xl font-bold">{profile?.stamps || 0}</span>
                <span className="text-lg mb-1 opacity-90">stamps</span>
              </>
            ) : (
              <>
                <span className="text-3xl font-bold">{profile?.points || 0}</span>
                <span className="text-lg mb-1 opacity-90">points</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Redemption Limit Warning */}
      <div className="px-6 mt-6">
        {todayRedemptions >= maxRedemptions && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 font-semibold">
              ⚠️ Daily Limit Reached
            </p>
            <p className="text-xs text-red-700 mt-1">
              You have reached the maximum redemptions for today ({maxRedemptions}).
              Please try again tomorrow.
            </p>
          </div>
        )}

        {todayRedemptions > 0 && todayRedemptions < maxRedemptions && maxRedemptions - todayRedemptions <= 2 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 font-semibold">
              ⚡ {maxRedemptions - todayRedemptions} Redemption{maxRedemptions - todayRedemptions > 1 ? 's' : ''} Remaining Today
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              You can redeem {maxRedemptions - todayRedemptions} more reward{maxRedemptions - todayRedemptions > 1 ? 's' : ''} today.
            </p>
          </div>
        )}
      </div>

      {/* Rewards List */}
      <div className="px-6 space-y-4">
        {rewards.length === 0 ? (
          <div className="card text-center py-12">
            <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No rewards available yet</p>
          </div>
        ) : (
          rewards.map((reward) => {
            const canRedeemReward = canRedeem(reward)
            const isStampMode = restaurant?.loyalty_mode === 'stamps'
            const requiredAmount = isStampMode ? reward.required_stamps : reward.required_points

            return (
              <div
                key={reward.id}
                className={`card ${canRedeemReward ? 'border-2 border-primary' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-4 mb-3">
                  {/* Image spanning top to bottom */}
                  {reward.image_url && (
                    <div className="flex-shrink-0 w-24 h-32 rounded-lg overflow-hidden">
                      <Image
                        src={reward.image_url}
                        alt={reward.title}
                        width={96}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content next to image */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{reward.title}</h3>
                      {reward.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{reward.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-primary font-semibold">
                        {isStampMode ? (
                          <>
                            <Award className="h-5 w-5" />
                            <span>{requiredAmount} stamps</span>
                          </>
                        ) : (
                          <>
                            <Gift className="h-5 w-5" />
                            <span>{requiredAmount} points</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Button aligned to bottom of content area */}
                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canRedeemReward || todayRedemptions >= maxRedemptions}
                      className={`w-full py-3 rounded-lg font-semibold transition-colors mt-3 ${
                        canRedeemReward && todayRedemptions < maxRedemptions
                          ? 'bg-primary text-white hover:bg-primary-dark'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {todayRedemptions >= maxRedemptions
                        ? 'Daily Limit Reached'
                        : canRedeemReward
                          ? 'Redeem Now'
                          : 'Insufficient Balance'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
