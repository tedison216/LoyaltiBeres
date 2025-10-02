'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant, Reward } from '@/lib/types/database'
import { ArrowLeft, Gift, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateRedemptionCode } from '@/lib/utils/qr-code'

export default function RewardsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)

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

      {/* Rewards List */}
      <div className="px-6 mt-6 space-y-4">
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
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{reward.title}</h3>
                    {reward.description && (
                      <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
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
                </div>

                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={!canRedeemReward}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    canRedeemReward
                      ? 'bg-primary text-white hover:bg-primary-dark'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {canRedeemReward ? 'Redeem Now' : 'Insufficient Balance'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
