'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant } from '@/lib/types/database'
import { ArrowLeft, Users, Award, Gift, Plus, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CustomersManagementPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [customers, setCustomers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerPin, setNewCustomerPin] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    console.log('Loading customers data...')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Session:', session)
      
      if (!session) {
        console.log('No session, redirecting to login')
        router.push('/auth/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        toast.error('Failed to load profile: ' + profileError.message)
        return
      }

      console.log('Profile data:', profileData)

      if (!profileData || profileData.role !== 'admin') {
        console.log('Not admin or no profile')
        toast.error('Unauthorized access')
        router.push('/auth/login')
        return
      }

      setProfile(profileData)
      console.log('Restaurant ID:', profileData.restaurant_id)

      if (profileData.restaurant_id) {
        const { data: restaurantData } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', profileData.restaurant_id)
          .single()

        if (restaurantData) {
          setRestaurant(restaurantData)
        }

        const { data: customersData, error: customersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('role', 'customer')
          .order('created_at', { ascending: false })

        if (customersError) {
          console.error('Customers error:', customersError)
          toast.error('Failed to load customers: ' + customersError.message)
        } else if (customersData) {
          console.log('Loaded customers:', customersData.length)
          setCustomers(customersData)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load customers')
    } finally {
      console.log('Loading complete, setting loading to false')
      setLoading(false)
    }
  }

  async function handleAddCustomer() {
    if (!restaurant || !profile || !newCustomerPhone) {
      toast.error('Please provide phone number')
      return
    }

    if (!newCustomerName) {
      toast.error('Please provide customer name')
      return
    }

    setAdding(true)
    try {
      // Generate random 4-digit PIN if not provided
      const customerPin = newCustomerPin || Math.floor(1000 + Math.random() * 9000).toString()

      // Create a proper UUID for temp ID
      const tempId = crypto.randomUUID()

      // Add directly to profiles table
      const { error } = await supabase.from('profiles').insert({
        id: tempId,
        restaurant_id: restaurant.id,
        role: 'customer',
        full_name: newCustomerName,
        phone: newCustomerPhone,
        email: newCustomerEmail || null,
        pin: customerPin,
        is_temp: true, // Flag to indicate this is a temp profile
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('A customer with this phone already exists')
        } else {
          throw error
        }
        return
      }

      toast.success(`Customer added! PIN: ${customerPin}. Share this PIN with the customer.`)
      setShowAddForm(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      setNewCustomerEmail('')
      setNewCustomerPin('')
      loadData()
    } catch (error: any) {
      console.error('Error adding customer:', error)
      toast.error(error.message || 'Failed to add customer')
    } finally {
      setAdding(false)
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Customers</h1>
              <p className="text-sm opacity-90">
                {customers.length} total members
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
            
            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="input-field"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="label">Phone Number *</label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="input-field"
                  placeholder="8123456789"
                  required
                />
              </div>

              <div>
                <label className="label">Email (optional)</label>
                <input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="input-field"
                  placeholder="customer@email.com"
                />
              </div>

              <div>
                <label className="label">PIN (optional - auto-generated if empty)</label>
                <input
                  type="text"
                  value={newCustomerPin}
                  onChange={(e) => setNewCustomerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="input-field"
                  placeholder="1234"
                  maxLength={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to auto-generate a 4-digit PIN
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddCustomer}
                  disabled={adding}
                  className="flex-1 btn-primary"
                >
                  {adding ? 'Adding...' : 'Add Customer'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewCustomerName('')
                    setNewCustomerPhone('')
                    setNewCustomerEmail('')
                  }}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
