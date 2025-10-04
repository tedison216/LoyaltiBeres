'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant, Transaction } from '@/lib/types/database'
import { ArrowLeft, Plus, TrendingUp, Search, X, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateTime, formatCurrency } from '@/lib/utils/format'
import { logActivity } from '@/lib/utils/activity-log'
import { applyThemeColors } from '@/lib/utils/theme'

type TabType = 'today' | 'older' | 'cancelled'

export default function TransactionsManagementPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [customers, setCustomers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('today')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [dateFilter, setDateFilter] = useState('')
  const ITEMS_PER_PAGE = 10

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null)
  const [amount, setAmount] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [filteredCustomers, setFilteredCustomers] = useState<Profile[]>([])

  useEffect(() => {
    loadData()
  }, [activeTab, currentPage, dateFilter])

  useEffect(() => {
    if (searchQuery) {
      const filtered = customers.filter(customer => {
        const name = customer.full_name?.toLowerCase() || ''
        const phone = customer.phone?.toLowerCase() || ''
        const email = customer.email?.toLowerCase() || ''
        const query = searchQuery.toLowerCase()
        return name.includes(query) || phone.includes(query) || email.includes(query)
      })
      setFilteredCustomers(filtered)
    } else {
      setFilteredCustomers(customers)
    }
  }, [searchQuery, customers])

  function handleSelectCustomer(customer: Profile) {
    setSelectedCustomer(customer)
    setSelectedCustomerId(customer.id)
    setShowCustomerSearch(false)
    setSearchQuery('')
  }

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
          applyThemeColors({
            primary: restaurantData.theme_primary_color,
            secondary: restaurantData.theme_secondary_color,
            accent: restaurantData.theme_accent_color,
          })
        }

        // Build query based on active tab
        const today = new Date().toISOString().split('T')[0]
        
        let countQuery = supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', profileData.restaurant_id)

        let dataQuery = supabase
          .from('transactions')
          .select(`
            *,
            customer:profiles!transactions_customer_id_fkey(full_name, phone, email)
          `)
          .eq('restaurant_id', profileData.restaurant_id)

        if (activeTab === 'today') {
          countQuery = countQuery.eq('transaction_date', today).eq('status', 'active')
          dataQuery = dataQuery.eq('transaction_date', today).eq('status', 'active')
        } else if (activeTab === 'older') {
          countQuery = countQuery.lt('transaction_date', today).eq('status', 'active')
          dataQuery = dataQuery.lt('transaction_date', today).eq('status', 'active')
          
          // Apply date filter if set
          if (dateFilter) {
            countQuery = countQuery.eq('transaction_date', dateFilter)
            dataQuery = dataQuery.eq('transaction_date', dateFilter)
          }
        } else if (activeTab === 'cancelled') {
          countQuery = countQuery.eq('status', 'cancelled')
          dataQuery = dataQuery.eq('status', 'cancelled')
        }

        // Get total count
        const { count } = await countQuery
        setTotalCount(count || 0)

        // Load transactions with pagination
        const { data: transactionsData } = await dataQuery
          .order('created_at', { ascending: false })
          .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

        if (transactionsData) {
          setTransactions(transactionsData)
        }

        // Load customers (only once, not paginated)
        if (customers.length === 0) {
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
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelTransaction(transactionId: string) {
    if (!confirm('Are you sure you want to cancel this transaction? Points/stamps will be deducted from the customer.')) {
      return
    }

    try {
      // Get transaction details before cancelling
      const transaction = transactions.find(t => t.id === transactionId)
      
      // Update transaction status to cancelled (trigger will handle points/stamps deduction)
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('id', transactionId)

      if (error) throw error

      // Log the activity
      if (restaurant && profile && transaction) {
        await logActivity(
          restaurant.id,
          profile.id,
          'transaction_cancelled',
          'transaction',
          transactionId,
          {
            customer_id: (transaction as any).customer_id,
            amount: transaction.amount,
            points_earned: transaction.points_earned,
            stamps_earned: transaction.stamps_earned,
          }
        )
      }

      toast.success('Transaction cancelled successfully')
      loadData()
    } catch (error: any) {
      console.error('Error cancelling transaction:', error)
      toast.error(error.message || 'Failed to cancel transaction')
    }
  }

  async function handleDeleteTransaction(transactionId: string) {
    if (!confirm('Are you sure you want to permanently delete this cancelled transaction? This action cannot be undone.')) {
      return
    }

    try {
      // Get transaction details before deleting
      const transaction = transactions.find(t => t.id === transactionId)
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (error) throw error

      // Log the activity
      if (restaurant && profile && transaction) {
        await logActivity(
          restaurant.id,
          profile.id,
          'transaction_deleted',
          'transaction',
          transactionId,
          {
            amount: transaction.amount,
            status: 'cancelled',
          }
        )
      }

      toast.success('Transaction deleted successfully')
      loadData()
    } catch (error: any) {
      console.error('Error deleting transaction:', error)
      toast.error(error.message || 'Failed to delete transaction')
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
      setSelectedCustomer(null)
      setAmount('')
      setSearchQuery('')
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
            
            {selectedCustomer ? (
              <div className="card bg-primary/5 border-2 border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">{selectedCustomer.full_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">{selectedCustomer.phone || selectedCustomer.email}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm">
                        <strong>{restaurant?.loyalty_mode === 'stamps' ? selectedCustomer.stamps : selectedCustomer.points}</strong>
                        {' '}{restaurant?.loyalty_mode === 'stamps' ? 'stamps' : 'points'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null)
                      setSelectedCustomerId('')
                    }}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-red-600" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setShowCustomerSearch(true)
                    }}
                    onFocus={() => setShowCustomerSearch(true)}
                    className="input-field pl-10"
                    placeholder="Search by name, phone, or email..."
                  />
                </div>
                
                {showCustomerSearch && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                      >
                        <p className="font-semibold">{customer.full_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">{customer.phone || customer.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {restaurant?.loyalty_mode === 'stamps' ? customer.stamps : customer.points}
                          {' '}{restaurant?.loyalty_mode === 'stamps' ? 'stamps' : 'points'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('today')
              setCurrentPage(1)
              setDateFilter('')
            }}
            className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'today'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => {
              setActiveTab('older')
              setCurrentPage(1)
            }}
            className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'older'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500'
            }`}
          >
            Older
          </button>
          <button
            onClick={() => {
              setActiveTab('cancelled')
              setCurrentPage(1)
              setDateFilter('')
            }}
            className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'cancelled'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Date filter for older transactions */}
      {activeTab === 'older' && (
        <div className="bg-white border-b p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="input-field flex-1"
              placeholder="Filter by date"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

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
          <>
            {transactions.map((transaction: any) => (
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
                    {transaction.transaction_date && (
                      <p className="text-xs text-gray-400 mt-1">
                        Date: {new Date(transaction.transaction_date).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.status === 'cancelled' ? 'text-red-600' : 'text-green-600'}`}>
                        {transaction.status === 'cancelled' ? '-' : '+'}
                        {transaction.stamps_earned > 0
                          ? `${transaction.stamps_earned} stamps`
                          : `${transaction.points_earned} points`}
                      </p>
                      {transaction.status === 'cancelled' && (
                        <span className="text-xs text-red-600">Cancelled</span>
                      )}
                    </div>
                    {activeTab === 'cancelled' ? (
                      <button
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Permanently delete transaction"
                      >
                        <Trash2 className="h-5 w-5 text-red-600" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancelTransaction(transaction.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Cancel transaction"
                      >
                        <Trash2 className="h-5 w-5 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalCount > ITEMS_PER_PAGE && (
              <div className="card">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1))}
                    disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
