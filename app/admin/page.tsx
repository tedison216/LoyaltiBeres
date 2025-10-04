'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant } from '@/lib/types/database'
import { Settings, Gift, Image as ImageIcon, Users, LogOut, TrendingUp, Award, Database, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { applyThemeColors } from '@/lib/utils/theme'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    pendingRedemptions: 0,
    totalRedemptions: 0,
    totalTransactions: 0,
  })
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

      if (!profileData || profileData.role !== 'admin') {
        toast.error('Unauthorized access')
        router.push('/auth/login')
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

        // Load stats
        const [customersRes, pendingRes, redemptionsRes, transactionsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', profileData.restaurant_id)
            .eq('role', 'customer'),
          supabase
            .from('redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', profileData.restaurant_id)
            .eq('status', 'pending'),
          supabase
            .from('redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', profileData.restaurant_id),
          supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', profileData.restaurant_id),
        ])

        setStats({
          totalCustomers: customersRes.count || 0,
          pendingRedemptions: pendingRes.count || 0,
          totalRedemptions: redemptionsRes.count || 0,
          totalTransactions: transactionsRes.count || 0,
        })
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
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
          <div>
            <h1 className="text-2xl font-bold mb-1">{restaurant?.name || 'Restoran'}</h1>
            <p className="text-sm opacity-90">Dasbor Admin</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-sm opacity-90 mb-1">Total Pelanggan</p>
            <p className="text-3xl font-bold">{stats.totalCustomers}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-sm opacity-90 mb-1">Penukaran Menunggu</p>
            <p className="text-3xl font-bold">{stats.pendingRedemptions}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 mt-6">
        <h2 className="text-lg font-semibold mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/admin/settings')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <Settings className="h-10 w-10 text-primary mb-3" />
            <span className="font-semibold">Pengaturan</span>
          </button>
          <button
            onClick={() => router.push('/admin/rewards')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <Gift className="h-10 w-10 text-primary mb-3" />
            <span className="font-semibold">Hadiah</span>
          </button>
          <button
            onClick={() => router.push('/admin/promotions')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <ImageIcon className="h-10 w-10 text-primary mb-3" />
            <span className="font-semibold">Promosi</span>
          </button>
          <button
            onClick={() => router.push('/admin/customers')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <Users className="h-10 w-10 text-primary mb-3" />
            <span className="font-semibold">Pelanggan</span>
          </button>
          <button
            onClick={() => router.push('/admin/transactions')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <TrendingUp className="h-10 w-10 text-primary mb-3" />
            <span className="font-semibold">Transaksi</span>
          </button>
          <button
            onClick={() => router.push('/admin/redemptions')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8 relative"
          >
            <Award className="h-10 w-10 text-primary mb-3" />
            <span className="font-semibold">Penukaran</span>
            {stats.pendingRedemptions > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {stats.pendingRedemptions}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push('/admin/analytics')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <TrendingUp className="h-10 w-10 text-purple-600 mb-3" />
            <span className="font-semibold">Analitik</span>
          </button>
          <button
            onClick={() => router.push('/admin/activity-logs')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <FileText className="h-10 w-10 text-orange-600 mb-3" />
            <span className="font-semibold">Log Aktivitas</span>
          </button>
          <button
            onClick={() => router.push('/admin/data-management')}
            className="card hover:shadow-lg transition-shadow flex flex-col items-center justify-center py-8"
          >
            <Database className="h-10 w-10 text-blue-600 mb-3" />
            <span className="font-semibold">Manajemen Data</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-6 mt-6">
        <div className="card">
          <h3 className="font-semibold text-lg mb-3">Ringkasan Aktivitas</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Penukaran</span>
              <span className="font-semibold">{stats.totalRedemptions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Transaksi</span>
              <span className="font-semibold">{stats.totalTransactions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Mode Loyalitas</span>
              <span className="font-semibold capitalize">{restaurant?.loyalty_mode}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
