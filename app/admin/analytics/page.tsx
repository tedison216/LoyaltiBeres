'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant } from '@/lib/types/database'
import { ArrowLeft, TrendingUp, Users, Award, Gift } from 'lucide-react'

export default function AnalyticsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Analytics data
  const [weeklyCustomers, setWeeklyCustomers] = useState<any[]>([])
  const [pointsData, setPointsData] = useState({ issued: 0, redeemed: 0 })
  const [topRewards, setTopRewards] = useState<any[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [totalRedemptions, setTotalRedemptions] = useState(0)

  useEffect(() => {
    loadAnalytics()
  }, [])

  async function loadAnalytics() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!profileData || profileData.role !== 'admin') {
        router.push('/auth/login')
        return
      }

      setProfile(profileData)

      if (profileData.restaurant_id) {
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', profileData.restaurant_id)
          .single()

        setRestaurant(restaurantData)

        // Load total customers
        const { count: customersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('role', 'customer')
        
        setTotalCustomers(customersCount || 0)

        // Load total transactions
        const { count: transactionsCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('status', 'active')
        
        setTotalTransactions(transactionsCount || 0)

        // Load total redemptions
        const { count: redemptionsCount } = await supabase
          .from('redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('status', 'verified')
        
        setTotalRedemptions(redemptionsCount || 0)

        // Load weekly active customers
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: transactions } = await supabase
          .from('transactions')
          .select('customer_id, created_at')
          .eq('restaurant_id', profileData.restaurant_id)
          .gte('created_at', sevenDaysAgo.toISOString())

        // Group by day
        const dailyCustomers: Record<string, Set<string>> = {}
        transactions?.forEach(t => {
          const day = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          if (!dailyCustomers[day]) dailyCustomers[day] = new Set()
          dailyCustomers[day].add(t.customer_id)
        })

        const weeklyData = Object.entries(dailyCustomers).map(([day, customers]) => ({
          day,
          customers: customers.size
        }))
        setWeeklyCustomers(weeklyData)

        // Points issued vs redeemed
        const { data: allTransactions } = await supabase
          .from('transactions')
          .select('points_earned, stamps_earned')
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('status', 'active')

        const { data: redemptions } = await supabase
          .from('redemptions')
          .select('points_used, stamps_used')
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('status', 'verified')

        const isStampMode = restaurantData?.loyalty_mode === 'stamps'
        const issued = allTransactions?.reduce((sum, t) => 
          sum + (isStampMode ? t.stamps_earned : t.points_earned), 0) || 0
        const redeemed = redemptions?.reduce((sum, r) => 
          sum + (isStampMode ? r.stamps_used : r.points_used), 0) || 0

        setPointsData({ issued, redeemed })

        // Top rewards
        const { data: allRedemptions } = await supabase
          .from('redemptions')
          .select('reward_title')
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('status', 'verified')

        const rewardCounts: Record<string, number> = {}
        allRedemptions?.forEach(r => {
          rewardCounts[r.reward_title] = (rewardCounts[r.reward_title] || 0) + 1
        })

        const topRewardsData = Object.entries(rewardCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        setTopRewards(topRewardsData)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
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

  const isStampMode = restaurant?.loyalty_mode === 'stamps'

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/20 rounded-lg">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm opacity-90">Performance insights</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-6 w-6 text-blue-600" />
              <p className="text-sm text-blue-700">Total Customers</p>
            </div>
            <p className="text-3xl font-bold text-blue-900">{totalCustomers}</p>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <p className="text-sm text-green-700">Transactions</p>
            </div>
            <p className="text-3xl font-bold text-green-900">{totalTransactions}</p>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-6 w-6 text-purple-600" />
              <p className="text-sm text-purple-700">{isStampMode ? 'Stamps' : 'Points'} Issued</p>
            </div>
            <p className="text-3xl font-bold text-purple-900">{pointsData.issued}</p>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="h-6 w-6 text-orange-600" />
              <p className="text-sm text-orange-700">Redemptions</p>
            </div>
            <p className="text-3xl font-bold text-orange-900">{totalRedemptions}</p>
          </div>
        </div>

        {/* Weekly Active Customers */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Weekly Active Customers</h2>
          {weeklyCustomers.length > 0 ? (
            <div className="space-y-2">
              {weeklyCustomers.map((data, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-20">{data.day}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(data.customers / Math.max(...weeklyCustomers.map(d => d.customers))) * 100}%` }}
                    >
                      <span className="text-xs text-white font-semibold">{data.customers}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Points/Stamps Overview */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">{isStampMode ? 'Stamps' : 'Points'} Overview</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Issued</span>
                <span className="text-sm font-semibold">{pointsData.issued}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-green-500 h-full rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Redeemed</span>
                <span className="text-sm font-semibold">{pointsData.redeemed}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full"
                  style={{ width: `${pointsData.issued > 0 ? (pointsData.redeemed / pointsData.issued) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Remaining</span>
                <span className="text-sm font-semibold">{pointsData.issued - pointsData.redeemed}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${pointsData.issued > 0 ? ((pointsData.issued - pointsData.redeemed) / pointsData.issued) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Rewards */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Top Rewards</h2>
          {topRewards.length > 0 ? (
            <div className="space-y-3">
              {topRewards.map((reward, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{reward.name}</p>
                    <p className="text-xs text-gray-500">{reward.count} redemptions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{reward.count}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No redemptions yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
