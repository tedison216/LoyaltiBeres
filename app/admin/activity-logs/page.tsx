'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant, ActivityLog } from '@/lib/types/database'
import { ArrowLeft, Filter, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateTime } from '@/lib/utils/format'

export default function ActivityLogsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [filterType, setFilterType] = useState<string>('all')
  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    loadData()
  }, [currentPage, filterType])

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

        setRestaurant(restaurantData)

        // Load activity logs with pagination
        const from = (currentPage - 1) * ITEMS_PER_PAGE
        const to = from + ITEMS_PER_PAGE - 1

        let query = supabase
          .from('activity_logs')
          .select(`
            *,
            performer:profiles!activity_logs_performed_by_fkey(full_name, email)
          `, { count: 'exact' })
          .eq('restaurant_id', profileData.restaurant_id)
          .order('created_at', { ascending: false })
          .range(from, to)

        // Apply filter
        if (filterType !== 'all') {
          query = query.eq('action_type', filterType)
        }

        const { data: logsData, count, error } = await query

        if (error) throw error

        setLogs(logsData || [])
        setTotalCount(count || 0)
      }
    } catch (error) {
      console.error('Error loading activity logs:', error)
      toast.error('Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  function getActionLabel(actionType: string): string {
    const labels: Record<string, string> = {
      'points_adjustment': 'Points Adjusted',
      'transaction_cancelled': 'Transaction Cancelled',
      'transaction_deleted': 'Transaction Deleted',
      'customer_deleted': 'Customer Deleted',
      'customer_created': 'Customer Created',
      'customer_updated': 'Customer Updated',
      'redemption_verified': 'Redemption Verified',
      'redemption_cancelled': 'Redemption Cancelled',
      'bulk_delete': 'Bulk Delete',
      'csv_import': 'CSV Import',
    }
    return labels[actionType] || actionType
  }

  function getActionColor(actionType: string): string {
    if (actionType.includes('delete')) return 'text-red-600 bg-red-50'
    if (actionType.includes('cancel')) return 'text-orange-600 bg-orange-50'
    if (actionType.includes('create') || actionType.includes('import')) return 'text-green-600 bg-green-50'
    if (actionType.includes('update') || actionType.includes('adjust')) return 'text-blue-600 bg-blue-50'
    if (actionType.includes('verified')) return 'text-purple-600 bg-purple-50'
    return 'text-gray-600 bg-gray-50'
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
              <h1 className="text-2xl font-bold">Activity Logs</h1>
              <p className="text-sm opacity-90">{totalCount} total activities</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-5 w-5 flex-shrink-0" />
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filterType === 'all' ? 'bg-white text-primary' : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('points_adjustment')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filterType === 'points_adjustment' ? 'bg-white text-primary' : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            Points
          </button>
          <button
            onClick={() => setFilterType('transaction_cancelled')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filterType === 'transaction_cancelled' ? 'bg-white text-primary' : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            Cancelled
          </button>
          <button
            onClick={() => setFilterType('customer_deleted')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filterType === 'customer_deleted' ? 'bg-white text-primary' : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            Deleted
          </button>
          <button
            onClick={() => setFilterType('csv_import')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filterType === 'csv_import' ? 'bg-white text-primary' : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            Imports
          </button>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-3">
        {logs.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No activity logs found</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionColor(log.action_type)}`}>
                      {getActionLabel(log.action_type)}
                    </span>
                    {log.target_type && (
                      <span className="text-xs text-gray-500">
                        → {log.target_type}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    By: {log.performer?.full_name || log.performer?.email || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDateTime(log.created_at)}
                  </p>
                </div>
              </div>

              {/* Details */}
              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Details:</p>
                  <div className="bg-gray-50 rounded p-2 text-xs font-mono">
                    {Object.entries(log.details).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-gray-500">{key}:</span>
                        <span className="text-gray-900">{JSON.stringify(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
