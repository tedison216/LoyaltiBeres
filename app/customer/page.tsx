'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant, Promotion } from '@/lib/types/database'
import { Gift, Award, User, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { applyThemeColors } from '@/lib/utils/theme'

export default function CustomerHomePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0)

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
          applyThemeColors({
            primary: restaurantData.theme_primary_color,
            secondary: restaurantData.theme_secondary_color,
            accent: restaurantData.theme_accent_color,
          })
        }

        // Load active promotions
        const { data: promotionsData } = await supabase
          .from('promotions')
          .select('*')
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (promotionsData) {
          setPromotions(promotionsData)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  function nextPromo() {
    setCurrentPromoIndex((prev) => (prev + 1) % promotions.length)
  }

  function prevPromo() {
    setCurrentPromoIndex((prev) => (prev - 1 + promotions.length) % promotions.length)
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
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            {restaurant?.logo_url && (
              <div className="w-12 h-12 bg-white rounded-full overflow-hidden">
                <Image
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{restaurant?.name || 'Restaurant'}</h1>
              <p className="text-sm opacity-90">{profile?.full_name || 'Welcome!'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Balance Display */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <p className="text-sm opacity-90 mb-2">Your Balance</p>
          <div className="flex items-end gap-2">
            {restaurant?.loyalty_mode === 'stamps' ? (
              <>
                <span className="text-5xl font-bold">{profile?.stamps || 0}</span>
                <span className="text-xl mb-2 opacity-90">stamps</span>
              </>
            ) : (
              <>
                <span className="text-5xl font-bold">{profile?.points || 0}</span>
                <span className="text-xl mb-2 opacity-90">points</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Promotions Carousel */}
      {promotions.length > 0 && (
        <div className="px-6 mt-6">
          <h2 className="text-lg font-semibold mb-3">Active Promotions</h2>
          <div className="relative">
            <div className="card overflow-hidden">
              {promotions[currentPromoIndex].banner_url && (
                <div className="w-full h-40 bg-gray-200 mb-4 rounded-lg overflow-hidden">
                  <Image
                    src={promotions[currentPromoIndex].banner_url}
                    alt={promotions[currentPromoIndex].title}
                    width={400}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="font-semibold text-lg mb-2">
                {promotions[currentPromoIndex].title}
              </h3>
              <p className="text-gray-600 text-sm">
                {promotions[currentPromoIndex].description}
              </p>
            </div>

            {promotions.length > 1 && (
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={prevPromo}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  {promotions.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentPromoIndex
                          ? 'w-8 bg-primary'
                          : 'w-2 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextPromo}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-6 mt-6">
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/customer/rewards')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <Gift className="h-10 w-10 text-primary mb-3" />
            <span className="font-semibold">Rewards</span>
          </button>
          <button
            onClick={() => router.push('/customer/history')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <Award className="h-10 w-10 text-primary mb-3" />
            <span className="font-semibold">History</span>
          </button>
        </div>
      </div>

      {/* Loyalty Info */}
      {restaurant && (
        <div className="px-6 mt-6">
          <div className="card bg-gradient-to-br from-accent/20 to-secondary/20">
            <h3 className="font-semibold mb-2">How to Earn</h3>
            <p className="text-sm text-gray-700">
              {restaurant.loyalty_mode === 'stamps'
                ? `Spend ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(restaurant.stamp_ratio_amount)} to earn ${restaurant.stamp_ratio_stamps} stamp${restaurant.stamp_ratio_stamps > 1 ? 's' : ''}`
                : `Spend ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(restaurant.points_ratio_amount)} to earn ${restaurant.points_ratio_points} point${restaurant.points_ratio_points > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
