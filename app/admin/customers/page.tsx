'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant } from '@/lib/types/database'
import { ArrowLeft, Users, Award, Gift, Plus, UserPlus, ChevronLeft, ChevronRight, Edit, Trash2, Coins, Search, Download, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { exportToCSV, formatCustomersForCSV, parseCSVToCustomers } from '@/lib/utils/csv-export'
import { logActivity } from '@/lib/utils/activity-log'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function CustomersManagementPage() {
  const router = useRouter()
  const { t } = useLanguage()
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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 10
  
  // Edit customer state
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Profile | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [updating, setUpdating] = useState(false)
  
  // Adjust points state
  const [showAdjustPoints, setShowAdjustPoints] = useState(false)
  const [adjustingCustomer, setAdjustingCustomer] = useState<Profile | null>(null)
  const [pointsAdjustment, setPointsAdjustment] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState<'add' | 'subtract'>('add')
  const [adjusting, setAdjusting] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  
  // CSV import state
  const [importing, setImporting] = useState(false)

  const loadData = useCallback(async () => {
    console.log('Loading customers data...')
    try {
      setLoading(true)
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

        // Build query with search filters
        let query = supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .eq('restaurant_id', profileData.restaurant_id)
          .eq('role', 'customer')

        // Add search filters if search query exists
        if (searchQuery) {
          query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        }

        const { data: customersData, error: customersError, count } = await query
          .order('created_at', { ascending: false })
          .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

        setTotalCount(count || 0)

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
  }, [currentPage, searchQuery, router])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  function openEditForm(customer: Profile) {
    setEditingCustomer(customer)
    setEditName(customer.full_name || '')
    setEditPhone(customer.phone || '')
    setEditEmail(customer.email || '')
    setShowEditForm(true)
  }

  async function handleUpdateCustomer() {
    if (!editingCustomer || !editName) {
      toast.error('Please provide customer name')
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName,
          phone: editPhone || null,
          email: editEmail || null,
        })
        .eq('id', editingCustomer.id)

      if (error) throw error

      toast.success('Customer updated successfully')
      setShowEditForm(false)
      setEditingCustomer(null)
      loadData()
    } catch (error: any) {
      console.error('Error updating customer:', error)
      toast.error(error.message || 'Failed to update customer')
    } finally {
      setUpdating(false)
    }
  }

  function openAdjustPoints(customer: Profile) {
    setAdjustingCustomer(customer)
    setPointsAdjustment('')
    setAdjustmentReason('add')
    setShowAdjustPoints(true)
  }

  async function handleAdjustPoints() {
    if (!adjustingCustomer || !restaurant || !profile) return

    const amount = parseInt(pointsAdjustment)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setAdjusting(true)
    try {
      const isStampMode = restaurant.loyalty_mode === 'stamps'
      const currentValue = isStampMode ? adjustingCustomer.stamps : adjustingCustomer.points
      
      let newValue: number
      if (adjustmentReason === 'add') {
        newValue = currentValue + amount
      } else {
        newValue = Math.max(0, currentValue - amount)
      }

      const updateData = isStampMode 
        ? { stamps: newValue } 
        : { points: newValue }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', adjustingCustomer.id)

      if (error) throw error

      // Log the activity
      await logActivity(
        restaurant.id,
        profile.id,
        'points_adjustment',
        'customer',
        adjustingCustomer.id,
        {
          type: isStampMode ? 'stamps' : 'points',
          action: adjustmentReason,
          amount: amount,
          old_value: currentValue,
          new_value: newValue,
        }
      )

      toast.success(`${isStampMode ? 'Stamps' : 'Points'} adjusted successfully`)
      setShowAdjustPoints(false)
      setAdjustingCustomer(null)
      loadData()
    } catch (error: any) {
      console.error('Error adjusting points:', error)
      toast.error(error.message || 'Failed to adjust points')
    } finally {
      setAdjusting(false)
    }
  }

  async function handleDeleteCustomer(customer: Profile) {
    if (!confirm(`Are you sure you want to delete ${customer.full_name || 'this customer'}? This will also delete all their transactions and redemptions.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', customer.id)

      if (error) throw error

      // Log the activity
      if (restaurant && profile) {
        await logActivity(
          restaurant.id,
          profile.id,
          'customer_deleted',
          'customer',
          customer.id,
          {
            customer_name: customer.full_name,
            customer_phone: customer.phone,
            points: customer.points,
            stamps: customer.stamps,
          }
        )
      }

      toast.success('Customer deleted successfully')
      loadData()
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      toast.error(error.message || 'Failed to delete customer')
    }
  }
  
  async function handleExportCSV() {
    try {
      const formattedData = formatCustomersForCSV(customers)
      exportToCSV(formattedData, 'customers')
      toast.success(`Exported ${customers.length} customers`)
    } catch (error: any) {
      console.error('Error exporting CSV:', error)
      toast.error(error.message || 'Failed to export CSV')
    }
  }
  
  async function handleImportCSV(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !restaurant || !profile) return

    setImporting(true)
    try {
      const text = await file.text()
      const customersData = parseCSVToCustomers(text)
      
      if (customersData.length === 0) {
        toast.error('No valid customer data found in CSV')
        return
      }

      let successCount = 0
      let errorCount = 0

      for (const customerData of customersData) {
        try {
          const tempId = crypto.randomUUID()
          const customerPin = Math.floor(1000 + Math.random() * 9000).toString()

          const { error } = await supabase.from('profiles').insert({
            id: tempId,
            restaurant_id: restaurant.id,
            role: 'customer',
            full_name: customerData.full_name || '',
            phone: customerData.phone || '',
            email: customerData.email || null,
            points: customerData.points || 0,
            stamps: customerData.stamps || 0,
            pin: customerPin,
            is_temp: true,
          })

          if (error) {
            console.error('Error importing customer:', error)
            errorCount++
          } else {
            successCount++
          }
        } catch (err) {
          errorCount++
        }
      }

      // Log the activity
      await logActivity(
        restaurant.id,
        profile.id,
        'csv_import',
        'customer',
        undefined,
        {
          total: customersData.length,
          success: successCount,
          errors: errorCount,
        }
      )

      toast.success(`Imported ${successCount} customers. ${errorCount > 0 ? `${errorCount} failed.` : ''}`)
      loadData()
      
      // Reset file input
      event.target.value = ''
    } catch (error: any) {
      console.error('Error importing CSV:', error)
      toast.error(error.message || 'Failed to import CSV')
    } finally {
      setImporting(false)
    }
  }
  
  function downloadCSVTemplate() {
    const template = [
      ['full_name', 'phone', 'email', 'pin'],
      ['John Doe', '8123456789', 'john@example.com', '1234'],
      ['Jane Smith', '8198765432', '', ''],
      ['Bob Wilson', '8187654321', 'bob@example.com', ''],
    ]
    
    const csvContent = template.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'customer_import_template.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to first page when searching
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
        <div className="flex items-center justify-between mb-4">
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
                {totalCount} total members
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadCSVTemplate}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
              title="Download CSV Template"
            >
              <Download className="h-5 w-5" />
              <span className="text-xs">Template</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
              title="Export to CSV"
            >
              <Download className="h-5 w-5" />
            </button>
            <label className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              title="Import from CSV">
              <Upload className="h-5 w-5" />
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
                disabled={importing}
              />
            </label>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900"
          />
        </div>
      </div>

      {/* Edit Customer Modal */}
      {showEditForm && editingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Edit Customer</h2>
            
            <div className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="input-field"
                  placeholder="8123456789"
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="input-field"
                  placeholder="customer@email.com"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleUpdateCustomer}
                  disabled={updating}
                  className="flex-1 btn-primary"
                >
                  {updating ? 'Updating...' : 'Update Customer'}
                </button>
                <button
                  onClick={() => {
                    setShowEditForm(false)
                    setEditingCustomer(null)
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

      {/* Adjust Points Modal */}
      {showAdjustPoints && adjustingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              Adjust {restaurant?.loyalty_mode === 'stamps' ? 'Stamps' : 'Points'}
            </h2>
            
            <div className="space-y-4">
              <div className="card bg-gray-50">
                <p className="text-sm text-gray-600 mb-1">{adjustingCustomer.full_name}</p>
                <p className="text-2xl font-bold text-primary">
                  Current: {restaurant?.loyalty_mode === 'stamps' ? adjustingCustomer.stamps : adjustingCustomer.points}
                  {' '}{restaurant?.loyalty_mode === 'stamps' ? 'stamps' : 'points'}
                </p>
              </div>

              <div>
                <label className="label">Action</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAdjustmentReason('add')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                      adjustmentReason === 'add'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setAdjustmentReason('subtract')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                      adjustmentReason === 'subtract'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Subtract
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Amount *</label>
                <input
                  type="number"
                  value={pointsAdjustment}
                  onChange={(e) => setPointsAdjustment(e.target.value)}
                  className="input-field"
                  placeholder="10"
                  min="1"
                  required
                />
              </div>

              {pointsAdjustment && (
                <div className="card bg-gradient-to-br from-accent/20 to-secondary/20">
                  <p className="text-sm text-gray-700 mb-1">New balance will be:</p>
                  <p className="text-2xl font-bold text-primary">
                    {adjustmentReason === 'add'
                      ? (restaurant?.loyalty_mode === 'stamps' ? adjustingCustomer.stamps : adjustingCustomer.points) + parseInt(pointsAdjustment || '0')
                      : Math.max(0, (restaurant?.loyalty_mode === 'stamps' ? adjustingCustomer.stamps : adjustingCustomer.points) - parseInt(pointsAdjustment || '0'))
                    }
                    {' '}{restaurant?.loyalty_mode === 'stamps' ? 'stamps' : 'points'}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleAdjustPoints}
                  disabled={adjusting}
                  className="flex-1 btn-primary"
                >
                  {adjusting ? 'Adjusting...' : 'Confirm'}
                </button>
                <button
                  onClick={() => {
                    setShowAdjustPoints(false)
                    setAdjustingCustomer(null)
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

      {/* Add Customer Modal */}
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
            <p className="text-gray-500">{searchQuery ? 'No customers found' : 'No customers yet'}</p>
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
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditForm(customer)}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Edit customer"
                  >
                    <Edit className="h-4 w-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => openAdjustPoints(customer)}
                    className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                    title="Adjust points/stamps"
                  >
                    <Coins className="h-4 w-4 text-green-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete customer"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
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
      </div>
    </div>
  )
}