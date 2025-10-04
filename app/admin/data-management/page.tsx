'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant } from '@/lib/types/database'
import { ArrowLeft, Download, Trash2, Database, AlertTriangle, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { exportToCSV, formatCustomersForCSV, formatTransactionsForCSV, formatRedemptionsForCSV } from '@/lib/utils/csv-export'
import { exportCustomersToPDF, exportTransactionsToPDF, exportRedemptionsToPDF, type PDFMetadataItem } from '@/lib/utils/pdf-export'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { logActivity } from '@/lib/utils/activity-log'

type TransactionStatusFilter = 'all' | 'active' | 'completed' | 'pending' | 'cancelled'
type RedemptionStatusFilter = 'all' | 'verified' | 'pending' | 'cancelled'

export default function DataManagementPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<TransactionStatusFilter>('all')
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState<RedemptionStatusFilter>('all')
  const [transactionStartDate, setTransactionStartDate] = useState('')
  const [transactionEndDate, setTransactionEndDate] = useState('')
  const [redemptionStartDate, setRedemptionStartDate] = useState('')
  const [redemptionEndDate, setRedemptionEndDate] = useState('')

  const transactionStatusOptions: { value: TransactionStatusFilter; label: string }[] = [
    { value: 'all', label: 'Semua status' },
    { value: 'active', label: 'Aktif (Menunggu & Selesai)' },
    { value: 'completed', label: 'Hanya selesai' },
    { value: 'pending', label: 'Hanya menunggu' },
    { value: 'cancelled', label: 'Hanya dibatalkan' },
  ]

  const redemptionStatusOptions: { value: RedemptionStatusFilter; label: string }[] = [
    { value: 'all', label: 'Semua status' },
    { value: 'verified', label: 'Hanya terverifikasi' },
    { value: 'pending', label: 'Hanya menunggu' },
    { value: 'cancelled', label: 'Hanya dibatalkan' },
  ]

  const getTransactionStatusLabel = (value: TransactionStatusFilter = transactionStatusFilter) =>
    transactionStatusOptions.find(option => option.value === value)?.label ?? 'Semua status'

  const getRedemptionStatusLabel = (value: RedemptionStatusFilter = redemptionStatusFilter) =>
    redemptionStatusOptions.find(option => option.value === value)?.label ?? 'Semua status'

  const getDateRangeLabel = (start: string, end: string) => {
    if (start && end) {
      if (start === end) return formatDate(start)
      return `${formatDate(start)} – ${formatDate(end)}`
    }
    if (start) return `Mulai ${formatDate(start)}`
    if (end) return `Sampai ${formatDate(end)}`
    return 'Sepanjang waktu'
  }

  const startOfDay = (date: string) => `${date}T00:00:00`
  const endOfDay = (date: string) => `${date}T23:59:59`

  const isInvalidDateRange = (start: string, end: string) => {
    if (!start || !end) return false
    return new Date(start) > new Date(end)
  }

  const resetTransactionFilters = () => {
    setTransactionStatusFilter('all')
    setTransactionStartDate('')
    setTransactionEndDate('')
  }

  const resetRedemptionFilters = () => {
    setRedemptionStatusFilter('all')
    setRedemptionStartDate('')
    setRedemptionEndDate('')
  }

  const applyTransactionFilters = (query: any) => {
    if (transactionStatusFilter === 'active') {
      query = query.neq('status', 'cancelled')
    } else if (transactionStatusFilter === 'completed') {
      query = query.eq('status', 'completed')
    } else if (transactionStatusFilter === 'pending') {
      query = query.eq('status', 'pending')
    } else if (transactionStatusFilter === 'cancelled') {
      query = query.eq('status', 'cancelled')
    }

    if (transactionStartDate) {
      query = query.gte('created_at', startOfDay(transactionStartDate))
    }
    if (transactionEndDate) {
      query = query.lte('created_at', endOfDay(transactionEndDate))
    }

    return query
  }

  const applyRedemptionFilters = (query: any) => {
    if (redemptionStatusFilter === 'verified') {
      query = query.eq('status', 'verified')
    } else if (redemptionStatusFilter === 'pending') {
      query = query.eq('status', 'pending')
    } else if (redemptionStatusFilter === 'cancelled') {
      query = query.eq('status', 'cancelled')
    }

    if (redemptionStartDate) {
      query = query.gte('created_at', startOfDay(redemptionStartDate))
    }
    if (redemptionEndDate) {
      query = query.lte('created_at', endOfDay(redemptionEndDate))
    }

    return query
  }

  async function fetchTransactionsForExport() {
    if (!restaurant) {
      return { data: [], count: 0 }
    }

    let query = supabase
      .from('transactions')
      .select(`
        *,
        customer:profiles!transactions_customer_id_fkey(full_name, phone, email)
      `, { count: 'exact' })
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })

    query = applyTransactionFilters(query)

    const { data, error, count } = await query
    if (error) throw error

    return { data: data ?? [], count: count ?? (data?.length ?? 0) }
  }

  async function fetchRedemptionsForExport() {
    if (!restaurant) {
      return { data: [], count: 0 }
    }

    let query = supabase
      .from('redemptions')
      .select(`
        *,
        customer:profiles!redemptions_customer_id_fkey(full_name, phone, email)
      `, { count: 'exact' })
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })

    query = applyRedemptionFilters(query)

    const { data, error, count } = await query
    if (error) throw error

    return { data: data ?? [], count: count ?? (data?.length ?? 0) }
  }

  const transactionFiltersActive =
    transactionStatusFilter !== 'all' || Boolean(transactionStartDate) || Boolean(transactionEndDate)
  const redemptionFiltersActive =
    redemptionStatusFilter !== 'all' || Boolean(redemptionStartDate) || Boolean(redemptionEndDate)

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
        toast.error('Akses tidak sah')
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
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  async function handleExportCustomersPDF() {
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

      exportCustomersToPDF(data || [], restaurant.name)
      toast.success(`Berhasil membuat PDF untuk ${data?.length || 0} pelanggan`)
    } catch (error: any) {
      console.error('Error generating customers PDF:', error)
      toast.error(error.message || 'Gagal membuat PDF pelanggan')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportTransactionsPDF() {
    if (!restaurant) return

    if (isInvalidDateRange(transactionStartDate, transactionEndDate)) {
      toast.error('Rentang tanggal transaksi tidak valid')
      return
    }

    setExporting(true)
    try {
      const { data, count } = await fetchTransactionsForExport()

      if (!data.length) {
        toast.error('Tidak ada transaksi sesuai filter yang dipilih')
        return
      }

      const totalAmount = data.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
      const totalPoints = data.reduce((sum: number, item: any) => sum + (item.points_earned || 0), 0)
      const totalStamps = data.reduce((sum: number, item: any) => sum + (item.stamps_earned || 0), 0)

      const metadata: PDFMetadataItem[] = [
        { label: 'Restoran', value: restaurant.name || 'N/A' },
        { label: 'Filter Status', value: getTransactionStatusLabel() },
        { label: 'Rentang Tanggal', value: getDateRangeLabel(transactionStartDate, transactionEndDate) },
      ]

      const summary: PDFMetadataItem[] = [
        { label: 'Total Data', value: String(count || data.length) },
        { label: 'Total Nominal', value: formatCurrency(totalAmount) },
        { label: 'Total Poin Didapat', value: String(totalPoints) },
        { label: 'Total Stempel Didapat', value: String(totalStamps) },
      ]

      exportTransactionsToPDF(data, restaurant.name, metadata, summary)
      toast.success(`Berhasil membuat PDF untuk ${count || data.length} transaksi`)
    } catch (error: any) {
      console.error('Error generating transactions PDF:', error)
      toast.error(error.message || 'Gagal membuat PDF transaksi')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportRedemptionsPDF() {
    if (!restaurant) return

    if (isInvalidDateRange(redemptionStartDate, redemptionEndDate)) {
      toast.error('Rentang tanggal penukaran tidak valid')
      return
    }

    setExporting(true)
    try {
      const { data, count } = await fetchRedemptionsForExport()

      if (!data.length) {
        toast.error('Tidak ada penukaran sesuai filter yang dipilih')
        return
      }

      const totalPointsUsed = data.reduce((sum: number, item: any) => sum + (item.points_used || 0), 0)
      const totalStampsUsed = data.reduce((sum: number, item: any) => sum + (item.stamps_used || 0), 0)

      const metadata: PDFMetadataItem[] = [
        { label: 'Restoran', value: restaurant.name || 'N/A' },
        { label: 'Filter Status', value: getRedemptionStatusLabel() },
        { label: 'Rentang Tanggal', value: getDateRangeLabel(redemptionStartDate, redemptionEndDate) },
      ]

      const summary: PDFMetadataItem[] = [
        { label: 'Total Data', value: String(count || data.length) },
        { label: 'Total Poin Ditukar', value: String(totalPointsUsed) },
        { label: 'Total Stempel Ditukar', value: String(totalStampsUsed) },
      ]

      exportRedemptionsToPDF(data, restaurant.name, metadata, summary)
      toast.success(`Berhasil membuat PDF untuk ${count || data.length} penukaran`)
    } catch (error: any) {
      console.error('Error generating redemptions PDF:', error)
      toast.error(error.message || 'Gagal membuat PDF penukaran')
    } finally {
      setExporting(false)
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
      toast.success(`Berhasil mengekspor ${data?.length || 0} pelanggan`)
    } catch (error: any) {
      console.error('Error exporting customers:', error)
      toast.error(error.message || 'Gagal mengekspor pelanggan')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportTransactions() {
    if (!restaurant) return

    if (isInvalidDateRange(transactionStartDate, transactionEndDate)) {
      toast.error('Rentang tanggal transaksi tidak valid')
      return
    }

    setExporting(true)
    try {
      const { data, count } = await fetchTransactionsForExport()

      if (!data.length) {
        toast.error('Tidak ada transaksi sesuai filter yang dipilih')
        return
      }

      const formattedData = formatTransactionsForCSV(data)
      exportToCSV(formattedData, 'transactions')
      toast.success(`Berhasil mengekspor ${count || data.length} transaksi`)
    } catch (error: any) {
      console.error('Error exporting transactions:', error)
      toast.error(error.message || 'Gagal mengekspor transaksi')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportRedemptions() {
    if (!restaurant) return

    if (isInvalidDateRange(redemptionStartDate, redemptionEndDate)) {
      toast.error('Rentang tanggal penukaran tidak valid')
      return
    }

    setExporting(true)
    try {
      const { data, count } = await fetchRedemptionsForExport()

      if (!data.length) {
        toast.error('Tidak ada penukaran sesuai filter yang dipilih')
        return
      }

      const formattedData = formatRedemptionsForCSV(data)
      exportToCSV(formattedData, 'redemptions')
      toast.success(`Berhasil mengekspor ${count || data.length} penukaran`)
    } catch (error: any) {
      console.error('Error exporting redemptions:', error)
      toast.error(error.message || 'Gagal mengekspor penukaran')
    } finally {
      setExporting(false)
    }
  }

  async function handleMassDelete() {
    if (!restaurant || !profile) return

    const confirmMessage = useCustomRange
      ? `Hapus semua ${deleteType} dari ${customStartDate} sampai ${customEndDate}?`
      : `Hapus semua ${deleteType} yang lebih lama dari ${deleteOlderThan} hari?`

    if (!confirm(`${confirmMessage}\n\nTindakan ini tidak dapat dibatalkan!`)) {
      return
    }

    setDeleting(true)
    try {
      let cutoffDate: string
      
      if (useCustomRange) {
        if (!customStartDate || !customEndDate) {
          toast.error('Mohon pilih tanggal mulai dan akhir')
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

      toast.success(`Berhasil menghapus ${deletedCount} data`)
      setShowDeleteModal(false)
    } catch (error: any) {
      console.error('Error deleting data:', error)
      toast.error(error.message || 'Gagal menghapus data')
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
            <h1 className="text-2xl font-bold">Manajemen Data</h1>
            <p className="text-sm opacity-90">Ekspor dan kelola data Anda</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-6">
        {/* Export Section */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Download className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold">Ekspor Data</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Hasilkan spreadsheet CSV atau laporan PDF siap pakai untuk cadangan, analisis, dan berbagi
          </p>

          <div className="space-y-4">
            <div className="space-y-2 bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-semibold text-blue-900">Pelanggan</p>
                  <p className="text-xs text-blue-700">Ekspor seluruh profil pelanggan dan saldo mereka</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                <button
                  onClick={handleExportCustomers}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Unduh CSV
                </button>
                <button
                  onClick={handleExportCustomersPDF}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold transition-colors disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  Buat PDF
                </button>
              </div>
            </div>

            <div className="space-y-3 bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold text-green-900">Transaksi</p>
                  <p className="text-xs text-green-700">Ekspor riwayat transaksi dengan filter kustom</p>
                </div>
              </div>

              <div className="bg-white/70 border border-green-100 rounded-lg p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-green-900">
                  <span className="font-semibold uppercase tracking-wide text-green-700">Filter</span>
                  <span>{getTransactionStatusLabel()}</span>
                  <span>•</span>
                  <span>{getDateRangeLabel(transactionStartDate, transactionEndDate)}</span>
                  <button
                    type="button"
                    onClick={resetTransactionFilters}
                    disabled={!transactionFiltersActive || exporting}
                    className="ml-auto px-2 py-1 rounded-md bg-green-100 hover:bg-green-200 text-green-800 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Hapus Filter
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col text-xs font-medium text-green-800">
                    Status
                    <select
                      value={transactionStatusFilter}
                      onChange={(e) => setTransactionStatusFilter(e.target.value as TransactionStatusFilter)}
                      disabled={exporting}
                      className="mt-1 input-field text-sm"
                    >
                      {transactionStatusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex flex-col text-xs font-medium text-green-800">
                      Tanggal Mulai
                      <input
                        type="date"
                        value={transactionStartDate}
                        onChange={(e) => setTransactionStartDate(e.target.value)}
                        disabled={exporting}
                        className="mt-1 input-field text-sm"
                      />
                    </label>
                    <label className="flex flex-col text-xs font-medium text-green-800">
                      Tanggal Selesai
                      <input
                        type="date"
                        value={transactionEndDate}
                        onChange={(e) => setTransactionEndDate(e.target.value)}
                        disabled={exporting}
                        className="mt-1 input-field text-sm"
                      />
                    </label>
                  </div>
                </div>

                {isInvalidDateRange(transactionStartDate, transactionEndDate) && (
                  <p className="text-xs text-red-600">Tanggal mulai tidak boleh lebih lambat dari tanggal akhir.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleExportTransactions}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Unduh CSV
                </button>
                <button
                  onClick={handleExportTransactionsPDF}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg bg-green-100 hover:bg-green-200 text-green-800 font-semibold transition-colors disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  Buat PDF
                </button>
              </div>
              {transactionFiltersActive && !isInvalidDateRange(transactionStartDate, transactionEndDate) && (
                <p className="text-xs text-green-700">
                  Laporan akan mencakup transaksi dengan status <strong>{getTransactionStatusLabel()}</strong> untuk rentang <strong>{getDateRangeLabel(transactionStartDate, transactionEndDate)}</strong>.
                </p>
              )}
            </div>

            <div className="space-y-3 bg-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-purple-600" />
                <div className="text-left">
                  <p className="font-semibold text-purple-900">Penukaran</p>
                  <p className="text-xs text-purple-700">Ekspor data penukaran dengan filter kustom</p>
                </div>
              </div>

              <div className="bg-white/70 border border-purple-100 rounded-lg p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-purple-900">
                  <span className="font-semibold uppercase tracking-wide text-purple-700">Filter</span>
                  <span>{getRedemptionStatusLabel()}</span>
                  <span>•</span>
                  <span>{getDateRangeLabel(redemptionStartDate, redemptionEndDate)}</span>
                  <button
                    type="button"
                    onClick={resetRedemptionFilters}
                    disabled={!redemptionFiltersActive || exporting}
                    className="ml-auto px-2 py-1 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Hapus Filter
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex flex-col text-xs font-medium text-purple-800">
                    Status
                    <select
                      value={redemptionStatusFilter}
                      onChange={(e) => setRedemptionStatusFilter(e.target.value as RedemptionStatusFilter)}
                      disabled={exporting}
                      className="mt-1 input-field text-sm"
                    >
                      {redemptionStatusOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex flex-col text-xs font-medium text-purple-800">
                      Tanggal Mulai
                      <input
                        type="date"
                        value={redemptionStartDate}
                        onChange={(e) => setRedemptionStartDate(e.target.value)}
                        disabled={exporting}
                        className="mt-1 input-field text-sm"
                      />
                    </label>
                    <label className="flex flex-col text-xs font-medium text-purple-800">
                      Tanggal Selesai
                      <input
                        type="date"
                        value={redemptionEndDate}
                        onChange={(e) => setRedemptionEndDate(e.target.value)}
                        disabled={exporting}
                        className="mt-1 input-field text-sm"
                      />
                    </label>
                  </div>
                </div>

                {isInvalidDateRange(redemptionStartDate, redemptionEndDate) && (
                  <p className="text-xs text-red-600">Tanggal mulai tidak boleh lebih lambat dari tanggal akhir.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleExportRedemptions}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Unduh CSV
                </button>
                <button
                  onClick={handleExportRedemptionsPDF}
                  disabled={exporting}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold transition-colors disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  Buat PDF
                </button>
              </div>
              {redemptionFiltersActive && !isInvalidDateRange(redemptionStartDate, redemptionEndDate) && (
                <p className="text-xs text-purple-700">
                  Laporan akan mencakup penukaran dengan status <strong>{getRedemptionStatusLabel()}</strong> untuk rentang <strong>{getDateRangeLabel(redemptionStartDate, redemptionEndDate)}</strong>.
                </p>
              )}
            </div>
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
