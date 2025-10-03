'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant, Promotion } from '@/lib/types/database'
import { ArrowLeft, Plus, Edit, Trash2, Upload, Image as ImageIcon, MessageCircle, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils/format'
import { openWhatsApp } from '@/lib/utils/whatsapp'

export default function PromotionsManagementPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [uploading, setUploading] = useState(false)

  // WhatsApp feature state
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [customers, setCustomers] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

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

        const { data: promotionsData } = await supabase
          .from('promotions')
          .select('*')
          .eq('restaurant_id', profileData.restaurant_id)
          .order('created_at', { ascending: false })

        if (promotionsData) {
          setPromotions(promotionsData)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load promotions')
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(promotion: Promotion) {
    setEditingPromotion(promotion)
    setTitle(promotion.title)
    setDescription(promotion.description || '')
    setBannerUrl(promotion.banner_url || '')
    setLinkUrl(promotion.link_url || '')
    setStartDate(promotion.start_date ? promotion.start_date.split('T')[0] : '')
    setEndDate(promotion.end_date ? promotion.end_date.split('T')[0] : '')
    setShowForm(true)
  }

  function handleNew() {
    setEditingPromotion(null)
    setTitle('')
    setDescription('')
    setBannerUrl('')
    setLinkUrl('')
    setStartDate('')
    setEndDate('')
    setShowForm(true)
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !restaurant) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${restaurant.id}-${Date.now()}.${fileExt}`
      const filePath = `banners/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('restaurant-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-assets')
        .getPublicUrl(filePath)

      setBannerUrl(publicUrl)
      toast.success('Banner uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading banner:', error)
      toast.error(error.message || 'Failed to upload banner')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!restaurant || !title) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const promotionData = {
        restaurant_id: restaurant.id,
        title,
        description,
        banner_url: bannerUrl || null,
        link_url: linkUrl || null,
        start_date: startDate || null,
        end_date: endDate || null,
        is_active: true,
      }

      if (editingPromotion) {
        const { error } = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id)

        if (error) throw error
        toast.success('Promotion updated successfully!')
      } else {
        const { error } = await supabase
          .from('promotions')
          .insert(promotionData)

        if (error) throw error
        toast.success('Promotion created successfully!')
      }

      setShowForm(false)
      loadData()
    } catch (error: any) {
      console.error('Error saving promotion:', error)
      toast.error(error.message || 'Failed to save promotion')
    }
  }

  async function loadCustomers() {
    if (!restaurant) return
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('role', 'customer')
      .order('full_name')
    
    if (error) {
      console.error('Error loading customers:', error)
      return
    }
    
    setCustomers(data || [])
  }

  function openCustomerSearch(promotion: Promotion) {
    setSelectedPromotion(promotion)
    setShowCustomerSearch(true)
    setSearchQuery('')
    loadCustomers()
  }

  function handleSendWhatsApp(customer: Profile) {
    if (!selectedPromotion || !customer.phone) return
    
    // Create message with promotion details
    const message = `Halo ${customer.full_name}, Sahabat Irba Steak! \n\n` +
      `Kita ada promo baru lho: *${selectedPromotion.title}*\n\n` +
      `${selectedPromotion.description}\n\n` +
      `${selectedPromotion.link_url ? `More info: ${selectedPromotion.link_url}` : ''}`
    
    openWhatsApp(customer.phone, message)
    setShowCustomerSearch(false)
    toast.success(`Opening WhatsApp for ${customer.full_name}`)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this promotion?')) return

    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Promotion deleted successfully!')
      loadData()
    } catch (error: any) {
      console.error('Error deleting promotion:', error)
      toast.error(error.message || 'Failed to delete promotion')
    }
  }

  async function toggleActive(promotion: Promotion) {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ is_active: !promotion.is_active })
        .eq('id', promotion.id)

      if (error) throw error

      toast.success(`Promotion ${promotion.is_active ? 'deactivated' : 'activated'}!`)
      loadData()
    } catch (error: any) {
      console.error('Error toggling promotion:', error)
      toast.error(error.message || 'Failed to update promotion')
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
            <h1 className="text-2xl font-bold">
              {editingPromotion ? 'Edit Promotion' : 'New Promotion'}
            </h1>
          </div>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="label">Promotion Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Summer Special Offer"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Get 20% off on all main courses..."
            />
          </div>

          <div>
            <label className="label">Banner Image</label>
            {bannerUrl && (
              <img
                src={bannerUrl}
                alt="Banner preview"
                className="w-full h-40 object-cover rounded-lg mb-2"
              />
            )}
            <label className="btn-secondary cursor-pointer w-full text-center">
              <Upload className="h-5 w-5 inline mr-2" />
              {uploading ? 'Uploading...' : 'Upload Banner'}
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          <div>
            <label className="label">Link URL (optional)</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="input-field"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <button onClick={handleSave} className="btn-primary w-full">
            {editingPromotion ? 'Update Promotion' : 'Create Promotion'}
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
            <h1 className="text-2xl font-bold">Promotions</h1>
          </div>
          <button
            onClick={handleNew}
            className="bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            <Plus className="h-5 w-5 inline mr-1" />
            New
          </button>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-4">
        {promotions.length === 0 ? (
          <div className="card text-center py-12">
            <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No promotions yet</p>
            <button onClick={handleNew} className="btn-primary">
              Create First Promotion
            </button>
          </div>
        ) : (
          promotions.map((promotion) => (
            <div
              key={promotion.id}
              className={`card ${!promotion.is_active ? 'opacity-60' : ''}`}
            >
              {promotion.banner_url && (
                <img
                  src={promotion.banner_url}
                  alt={promotion.title}
                  className="w-full h-40 object-cover rounded-lg mb-4"
                />
              )}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{promotion.title}</h3>
                  {promotion.description && (
                    <p className="text-sm text-gray-600 mb-2">{promotion.description}</p>
                  )}
                  {(promotion.start_date || promotion.end_date) && (
                    <p className="text-xs text-gray-500">
                      {promotion.start_date && formatDate(promotion.start_date)}
                      {promotion.start_date && promotion.end_date && ' - '}
                      {promotion.end_date && formatDate(promotion.end_date)}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    promotion.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {promotion.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openCustomerSearch(promotion)}
                  className="px-4 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                  title="Send via WhatsApp"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEdit(promotion)}
                  className="flex-1 btn-secondary"
                >
                  <Edit className="h-4 w-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(promotion)}
                  className="flex-1 btn-outline"
                >
                  {promotion.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(promotion.id)}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Send to Customer</h2>
              <button
                onClick={() => setShowCustomerSearch(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto p-4">
              {customers
                .filter(c => {
                  const query = searchQuery.toLowerCase()
                  return (
                    c.full_name?.toLowerCase().includes(query) ||
                    c.phone?.toLowerCase().includes(query) ||
                    c.email?.toLowerCase().includes(query)
                  )
                })
                .map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => handleSendWhatsApp(customer)}
                    className="w-full p-3 hover:bg-gray-50 rounded-lg transition-colors text-left mb-2 border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{customer.full_name}</p>
                        <p className="text-sm text-gray-600">{customer.phone}</p>
                      </div>
                      <MessageCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </button>
                ))}
              
              {customers.filter(c => {
                const query = searchQuery.toLowerCase()
                return (
                  c.full_name?.toLowerCase().includes(query) ||
                  c.phone?.toLowerCase().includes(query)
                )
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No customers found
                </div>
              )}
            </div>

            {/* Promotion Preview */}
            {selectedPromotion && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-600 mb-1">Sending promotion:</p>
                <p className="font-semibold text-sm">{selectedPromotion.title}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
