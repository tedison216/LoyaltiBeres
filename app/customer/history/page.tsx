'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Redemption, Transaction } from '@/lib/types/database'
import { ArrowLeft, Gift, TrendingUp, Award, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateTime, formatCurrency } from '@/lib/utils/format'

export default function HistoryPage() {
  const router = useRouter()
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeTab, setActiveTab] = useState<'redemptions' | 'transactions'>('redemptions')
  const [loading, setLoading] = useState(true)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    loadData()
  }, [currentPage])

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      // Load redemptions
      if (activeTab === 'redemptions') {
        const { data: redemptionsData, count } = await supabase
          .from('redemptions')
          .select('*', { count: 'exact' })
          .eq('customer_id', session.user.id)
          .order('created_at', { ascending: false })
          .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

        if (redemptionsData) {
          setRedemptions(redemptionsData)
        }
        setTotalCount(count || 0)
      }

      // Load transactions
      if (activeTab === 'transactions') {
        const { data: transactionsData, count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact' })
          .eq('customer_id', session.user.id)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)

        if (transactionsData) {
          setTransactions(transactionsData)
        }
        setTotalCount(count || 0)
      }
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when switching tabs
    loadData()
  }, [activeTab])

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

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
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold">History</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('redemptions')}
            className={`flex-1 py-4 font-semibold transition-colors ${
              activeTab === 'redemptions'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500'
            }`}
          >
            Redemptions
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-4 font-semibold transition-colors ${
              activeTab === 'transactions'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500'
            }`}
          >
            Transactions
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 mt-6 space-y-4">
        {activeTab === 'redemptions' ? (
          redemptions.length === 0 ? (
            <div className="card text-center py-12">
              <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No redemptions yet</p>
            </div>
          ) : (
            redemptions.map((redemption) => (
              <div key={redemption.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {redemption.reward_title}
                    </h3>
                    <p className="text-sm text-gray-600">
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
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Award className="h-5 w-5" />
                  <span>
                    {redemption.stamps_used > 0
                      ? `${redemption.stamps_used} stamps`
                      : `${redemption.points_used} points`}
                  </span>
                </div>
                {redemption.status === 'pending' && (
                  <button
                    onClick={() => router.push(`/customer/redemption/${redemption.redemption_code}`)}
                    className="btn-outline w-full mt-3"
                  >
                    View QR Code
                  </button>
                )}
              </div>
            ))
          )
        ) : transactions.length === 0 ? (
          <div className="card text-center py-12">
            <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No transactions yet</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {formatCurrency(transaction.amount)}
                  </h3>
                  <p className="text-sm text-gray-600">
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
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
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
