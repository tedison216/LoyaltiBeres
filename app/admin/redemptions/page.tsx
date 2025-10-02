'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Redemption } from '@/lib/types/database'
import { ArrowLeft, CheckCircle, XCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateTime } from '@/lib/utils/format'

export default function RedemptionsManagementPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [filteredRedemptions, setFilteredRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchCode, setSearchCode] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'cancelled'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    loadData()
    
    // Subscribe to redemption updates
    const channel = supabase
      .channel('admin-redemptions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'redemptions',
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [currentPage, statusFilter])

  useEffect(() => {
    filterRedemptions()
  }, [redemptions, searchCode])

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
        // Get total count for pagination
        let countQuery = supabase
          .from('redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', profileData.restaurant_id)

        if (statusFilter !== 'all') {
          countQuery = countQuery.eq('status', statusFilter)
        }

        const { count } = await countQuery
        setTotalCount(count || 0)

        // Get paginated data
        let query = supabase
          .from('redemptions')
          .select(`
            *,
            customer:profiles!redemptions_customer_id_fkey(full_name, phone, email)
          `)
          .eq('restaurant_id', profileData.restaurant_id)

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter)
        }

        const { data: redemptionsData } = await query
          .order('created_at', { ascending: false })
          .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

        if (redemptionsData) {
          setRedemptions(redemptionsData)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load redemptions')
    } finally {
      setLoading(false)
    }
  }

  function filterRedemptions() {
    let filtered = redemptions

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    if (searchCode) {
      filtered = filtered.filter(r => 
        r.redemption_code.toLowerCase().includes(searchCode.toLowerCase())
      )
    }

    setFilteredRedemptions(filtered)
  }

  async function handleVerify(redemption: Redemption) {
    if (!profile) return

    try {
      const { error } = await supabase
        .from('redemptions')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: profile.id,
        })
        .eq('id', redemption.id)

      if (error) throw error

      toast.success('Redemption verified!')
      loadData()
    } catch (error: any) {
      console.error('Error verifying redemption:', error)
      toast.error(error.message || 'Failed to verify redemption')
    }
  }

  async function handleCancel(redemption: Redemption) {
    if (!confirm('Are you sure you want to cancel this redemption?')) return

    try {
      const { error } = await supabase
        .from('redemptions')
        .update({ status: 'cancelled' })
        .eq('id', redemption.id)

      if (error) throw error

      toast.success('Redemption cancelled!')
      loadData()
    } catch (error: any) {
      console.error('Error cancelling redemption:', error)
      toast.error(error.message || 'Failed to cancel redemption')
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
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold">Redemptions</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Search by code..."
            className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex overflow-x-auto">
          {(['all', 'pending', 'verified', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 mt-6 space-y-4">
        {filteredRedemptions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No redemptions found</p>
          </div>
        ) : (
          <>
            {filteredRedemptions.map((redemption: any) => (
            <div key={redemption.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {redemption.reward_title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {redemption.customer?.full_name || redemption.customer?.phone || redemption.customer?.email || 'Unknown Customer'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(redemption.created_at)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    redemption.status === 'verified'
                      ? 'bg-green-100 text-green-700'
                      : redemption.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {redemption.status}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-600 mb-1">Redemption Code</p>
                <p className="font-mono font-bold text-lg text-primary">
                  {redemption.redemption_code}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-600">Cost:</span>
                <span className="font-semibold">
                  {redemption.stamps_used > 0
                    ? `${redemption.stamps_used} stamps`
                    : `${redemption.points_used} points`}
                </span>
              </div>

              {redemption.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerify(redemption)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Verify
                  </button>
                  <button
                    onClick={() => handleCancel(redemption)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    <XCircle className="h-4 w-4 inline mr-1" />
                    Cancel
                  </button>
                </div>
              )}

              {redemption.verified_at && (
                <p className="text-xs text-gray-500 mt-2">
                  Verified: {formatDateTime(redemption.verified_at)}
                </p>
              )}
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
