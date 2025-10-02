'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant, Transaction } from '@/lib/types/database'
import { ArrowLeft, Plus, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateTime, formatCurrency } from '@/lib/utils/format'

export default function TransactionsManagementPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [customers, setCustomers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [amount, setAmount] = useState('')

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

        // Load transactions
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select(`
            *,
            customer:profiles!transactions_customer_id_fkey(full_name, phone, email)
          `)
          .eq('restaurant_id', profileData.restaurant_id)
          .order('created_at', { ascending: false })

        if (transactionsData) {
          setTransactions(transactionsData)
        }

        // Load customers
        const { data: customersData } = await supabase
          .from('profiles')
          .select('*')
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('role', 'customer')
          .order('full_name')

        if (customersData) {
          setCustomers(customersData)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTransaction() {
    if (!restaurant || !selectedCustomerId || !amount) {
      toast.error('Please fill in all fields')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    try {
      const isStampMode = restaurant.loyalty_mode === 'stamps'
      
      // Calculate earned points/stamps
      let earned = 0
      if (isStampMode) {
        earned = Math.floor(amountNum / restaurant.stamp_ratio_amount) * restaurant.stamp_ratio_stamps
      } else {
        earned = Math.floor(amountNum / restaurant.points_ratio_amount) * restaurant.points_ratio_points
      }

      // Check if multiple stamps per day is allowed
      if (isStampMode && !restaurant.allow_multiple_stamps_per_day) {
        const today = new Date().toISOString().split('T')[0]
        const { data: existingTransaction } = await supabase
          .from('transactions')
          .select('id')
          .eq('customer_id', selectedCustomerId)
          .eq('transaction_date', today)
          .single()

        if (existingTransaction) {
          toast.error('Customer already earned stamps today')
          return
        }
      }

      const { error } = await supabase.from('transactions').insert({
        restaurant_id: restaurant.id,
        customer_id: selectedCustomerId,
        amount: amountNum,
        points_earned: isStampMode ? 0 : earned,
        stamps_earned: isStampMode ? earned : 0,
      })

      if (error) throw error

      toast.success(`Transaction added! Customer earned ${earned} ${isStampMode ? 'stamps' : 'points'}`)
      setShowForm(false)
      setSelectedCustomerId('')
      setAmount('')
      loadData()
    } catch (error: any) {
      console.error('Error adding transaction:', error)
      toast.error(error.message || 'Failed to add transaction')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowForm(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold">Add Transaction</h1>
          </div>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="label">Select Customer *</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="input-field"
            >
              <option value="">Choose a customer...</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name || customer.phone || customer.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Transaction Amount (Rp.) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field"
              placeholder="100000"
              min="0"
              step="1000"
            />
          </div>

          {amount && restaurant && (
            <div className="card bg-gradient-to-br from-accent/20 to-secondary/20">
              <p className="text-sm text-gray-700 mb-2">Customer will earn:</p>
              <p className="text-2xl font-bold text-primary">
                {restaurant.loyalty_mode === 'stamps'
                  ? `${Math.floor(parseFloat(amount) / restaurant.stamp_ratio_amount) * restaurant.stamp_ratio_stamps} stamps`
                  : `${Math.floor(parseFloat(amount) / restaurant.points_ratio_amount) * restaurant.points_ratio_points} points`}
              </p>
            </div>
          )}

          <button onClick={handleAddTransaction} className="btn-primary w-full">
            Add Transaction
          </button>
        </div>
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
            <h1 className="text-2xl font-bold">Transactions</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            <Plus className="h-5 w-5 inline mr-1" />
            New
          </button>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-4">
        {transactions.length === 0 ? (
          <div className="card text-center py-12">
            <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No transactions yet</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              Add First Transaction
            </button>
          </div>
        ) : (
          transactions.map((transaction: any) => (
            <div key={transaction.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {formatCurrency(transaction.amount)}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {transaction.customer?.full_name || transaction.customer?.phone || transaction.customer?.email || 'Unknown Customer'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(transaction.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-semibold">
                    +{transaction.stamps_earned > 0
                      ? `${transaction.stamps_earned} stamps`
                      : `${transaction.points_earned} points`}
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
