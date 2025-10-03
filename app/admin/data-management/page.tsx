'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant } from '@/lib/types/database'
import { ArrowLeft, Download, Trash2, Database, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { exportToCSV, formatCustomersForCSV, formatTransactionsForCSV, formatRedemptionsForCSV } from '@/lib/utils/csv-export'
import { logActivity } from '@/lib/utils/activity-log'

export default function DataManagementPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Mass delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteType, setDeleteType] = useState<'transactions' | 'redemptions' | 'all'>('transactions')
  const [deleteOlderThan, setDeleteOlderThan] = useState('365') // days
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [useCustomRange, setUseCustomRange] = useState(false)

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
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportCustomers() {
    if (!restaurant) return
    
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('role', 'customer')
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = formatCustomersForCSV(data || [])
      exportToCSV(formattedData, 'customers')
      toast.success(`Exported ${data?.length || 0} customers`)
    } catch (error: any) {
      console.error('Error exporting customers:', error)
      toast.error(error.message || 'Failed to export customers')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportTransactions() {
    if (!restaurant) return
    
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customer:profiles!transactions_customer_id_fkey(full_name, phone, email)
        `)
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = formatTransactionsForCSV(data || [])
      exportToCSV(formattedData, 'transactions')
      toast.success(`Exported ${data?.length || 0} transactions`)
    } catch (error: any) {
      console.error('Error exporting transactions:', error)
      toast.error(error.message || 'Failed to export transactions')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportRedemptions() {
    if (!restaurant) return
    
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from('redemptions')
        .select(`
          *,
          customer:profiles!redemptions_customer_id_fkey(full_name, phone, email)
        `)
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = formatRedemptionsForCSV(data || [])
      exportToCSV(formattedData, 'redemptions')
      toast.success(`Exported ${data?.length || 0} redemptions`)
    } catch (error: any) {
      console.error('Error exporting redemptions:', error)
      toast.error(error.message || 'Failed to export redemptions')
    } finally {
      setExporting(false)
    }
  }

  async function handleMassDelete() {
    if (!restaurant || !profile) return

    const confirmMessage = useCustomRange
      ? `Delete all ${deleteType} from ${customStartDate} to ${customEndDate}?`
      : `Delete all ${deleteType} older than ${deleteOlderThan} days?`

    if (!confirm(`${confirmMessage}\n\nThis action cannot be undone!`)) {
      return
    }

    setDeleting(true)
    try {
      let cutoffDate: string
      
      if (useCustomRange) {
        if (!customStartDate || !customEndDate) {
          toast.error('Please select both start and end dates')
          return
        }
        cutoffDate = customEndDate
      } else {
        const days = parseInt(deleteOlderThan)
        const date = new Date()
        date.setDate(date.getDate() - days)
        cutoffDate = date.toISOString().split('T')[0]
      }

      let deletedCount = 0

      if (deleteType === 'transactions' || deleteType === 'all') {
        let query = supabase
          .from('transactions')
          .delete()
          .eq('restaurant_id', restaurant.id)
          .lt('created_at', cutoffDate)

        if (useCustomRange && customStartDate) {
          query = query.gte('created_at', customStartDate)
        }

        const { error, count } = await query
        if (error) throw error
        deletedCount += count || 0
      }

      if (deleteType === 'redemptions' || deleteType === 'all') {
        let query = supabase
          .from('redemptions')
          .delete()
          .eq('restaurant_id', restaurant.id)
          .lt('created_at', cutoffDate)

        if (useCustomRange && customStartDate) {
          query = query.gte('created_at', customStartDate)
        }

        const { error, count } = await query
        if (error) throw error
        deletedCount += count || 0
      }

      // Log the activity
      await logActivity(
        restaurant.id,
        profile.id,
        'bulk_delete',
        deleteType,
        undefined,
        {
          delete_type: deleteType,
          cutoff_date: cutoffDate,
          custom_range: useCustomRange,
          start_date: customStartDate,
          end_date: customEndDate,
          deleted_count: deletedCount,
        }
      )

      toast.success(`Deleted ${deletedCount} records`)
      setShowDeleteModal(false)
    } catch (error: any) {
      console.error('Error deleting data:', error)
      toast.error(error.message || 'Failed to delete data')
    } finally {
      setDeleting(false)
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
            <h1 className="text-2xl font-bold">Data Management</h1>
            <p className="text-sm opacity-90">Export and manage your data</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-6">
        {/* Export Section */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Download className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Export Data</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Download your data as CSV files for backup or analysis
          </p>

          <div className="space-y-3">
            <button
              onClick={handleExportCustomers}
              disabled={exporting}
              className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-semibold text-blue-900">Export Customers</p>
                  <p className="text-xs text-blue-700">All customer profiles and balances</p>
                </div>
              </div>
              <Download className="h-5 w-5 text-blue-600" />
            </button>

            <button
              onClick={handleExportTransactions}
              disabled={exporting}
              className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold text-green-900">Export Transactions</p>
                  <p className="text-xs text-green-700">All transaction history</p>
                </div>
              </div>
              <Download className="h-5 w-5 text-green-600" />
            </button>

            <button
              onClick={handleExportRedemptions}
              disabled={exporting}
              className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-purple-600" />
                <div className="text-left">
                  <p className="font-semibold text-purple-900">Export Redemptions</p>
                  <p className="text-xs text-purple-700">All redemption records</p>
                </div>
              </div>
              <Download className="h-5 w-5 text-purple-600" />
            </button>
          </div>
        </div>

        {/* Mass Delete Section */}
        <div className="card border-2 border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Danger Zone</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete old data to free up space. This action cannot be undone.
          </p>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-center gap-2 p-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Trash2 className="h-5 w-5" />
            Mass Delete Old Data
          </button>
        </div>
      </div>

      {/* Mass Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-red-900 mb-4">Mass Delete Data</h2>
            
            <div className="space-y-4">
              <div>
                <label className="label">Data Type</label>
                <select
                  value={deleteType}
                  onChange={(e) => setDeleteType(e.target.value as any)}
                  className="input-field"
                >
                  <option value="transactions">Transactions Only</option>
                  <option value="redemptions">Redemptions Only</option>
                  <option value="all">All Data (Transactions & Redemptions)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={useCustomRange}
                    onChange={(e) => setUseCustomRange(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Use custom date range</span>
                </label>
              </div>

              {useCustomRange ? (
                <>
                  <div>
                    <label className="label">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="label">Delete data older than (days)</label>
                  <select
                    value={deleteOlderThan}
                    onChange={(e) => setDeleteOlderThan(e.target.value)}
                    className="input-field"
                  >
                    <option value="30">30 days (1 month)</option>
                    <option value="90">90 days (3 months)</option>
                    <option value="180">180 days (6 months)</option>
                    <option value="365">365 days (1 year)</option>
                    <option value="730">730 days (2 years)</option>
                  </select>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-semibold">⚠️ Warning</p>
                <p className="text-xs text-red-700 mt-1">
                  This will permanently delete the selected data. This action cannot be undone.
                  Make sure to export your data first if you need a backup.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleMassDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
