'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant } from '@/lib/types/database'
import { ArrowLeft, Users, Award, Gift } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CustomersManagementPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [customers, setCustomers] = useState<Profile[]>([])
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

      if (profileData.restaurant_id) {
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', profileData.restaurant_id)
          .single()

        if (restaurantData) {
          setRestaurant(restaurantData)
        }

        const { data: customersData } = await supabase
          .from('profiles')
          .select('*')
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('role', 'customer')
          .order('created_at', { ascending: false })

        if (customersData) {
          setCustomers(customersData)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load customers')
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Customers</h1>
            <p className="text-sm opacity-90">{customers.length} total members</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-4">
        {customers.length === 0 ? (
          <div className="card text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No customers yet</p>
          </div>
        ) : (
          customers.map((customer) => (
            <div key={customer.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {customer.full_name || 'Unknown'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {customer.phone || customer.email || 'No contact info'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    {restaurant?.loyalty_mode === 'stamps' ? (
                      <Award className="h-4 w-4" />
                    ) : (
                      <Gift className="h-4 w-4" />
                    )}
                    <span className="text-xs font-medium">
                      {restaurant?.loyalty_mode === 'stamps' ? 'Stamps' : 'Points'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {restaurant?.loyalty_mode === 'stamps' ? customer.stamps : customer.points}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-secondary mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium">Member Since</span>
                  </div>
                  <p className="text-sm font-semibold">
                    {new Date(customer.created_at).toLocaleDateString('id-ID', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
