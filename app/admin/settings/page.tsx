'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant, LoyaltyMode } from '@/lib/types/database'
import { ArrowLeft, Upload, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [loyaltyMode, setLoyaltyMode] = useState<LoyaltyMode>('stamps')
  const [primaryColor, setPrimaryColor] = useState('#FF6B6B')
  const [secondaryColor, setSecondaryColor] = useState('#4ECDC4')
  const [accentColor, setAccentColor] = useState('#FFE66D')
  const [stampRatioAmount, setStampRatioAmount] = useState(100000)
  const [stampRatioStamps, setStampRatioStamps] = useState(1)
  const [allowMultipleStamps, setAllowMultipleStamps] = useState(false)
  const [pointsRatioAmount, setPointsRatioAmount] = useState(10000)
  const [pointsRatioPoints, setPointsRatioPoints] = useState(1)

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
          setName(restaurantData.name)
          setLoyaltyMode(restaurantData.loyalty_mode)
          setPrimaryColor(restaurantData.theme_primary_color)
          setSecondaryColor(restaurantData.theme_secondary_color)
          setAccentColor(restaurantData.theme_accent_color)
          setStampRatioAmount(restaurantData.stamp_ratio_amount)
          setStampRatioStamps(restaurantData.stamp_ratio_stamps)
          setAllowMultipleStamps(restaurantData.allow_multiple_stamps_per_day)
          setPointsRatioAmount(restaurantData.points_ratio_amount)
          setPointsRatioPoints(restaurantData.points_ratio_points)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !restaurant) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${restaurant.id}-${Date.now()}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('restaurant-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-assets')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ logo_url: publicUrl })
        .eq('id', restaurant.id)

      if (updateError) throw updateError

      setRestaurant({ ...restaurant, logo_url: publicUrl })
      toast.success('Logo uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      toast.error(error.message || 'Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!restaurant) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          name,
          loyalty_mode: loyaltyMode,
          theme_primary_color: primaryColor,
          theme_secondary_color: secondaryColor,
          theme_accent_color: accentColor,
          stamp_ratio_amount: stampRatioAmount,
          stamp_ratio_stamps: stampRatioStamps,
          allow_multiple_stamps_per_day: allowMultipleStamps,
          points_ratio_amount: pointsRatioAmount,
          points_ratio_points: pointsRatioPoints,
        })
        .eq('id', restaurant.id)

      if (error) throw error

      toast.success('Settings saved successfully!')
      router.push('/admin')
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
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
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold">Restaurant Settings</h1>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Basic Info */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          
          <div className="mb-4">
            <label className="label">Restaurant Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="My Restaurant"
            />
          </div>

          <div>
            <label className="label">Logo</label>
            <div className="flex items-center gap-4">
              {restaurant?.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt="Logo"
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <label className="btn-secondary cursor-pointer">
                <Upload className="h-5 w-5 inline mr-2" />
                {uploading ? 'Uploading...' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Theme Colors */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Theme Colors</h2>
          
          <div className="space-y-4">
            <div>
              <label className="label">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-12 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="input-field flex-1"
                />
              </div>
            </div>

            <div>
              <label className="label">Secondary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-12 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="input-field flex-1"
                />
              </div>
            </div>

            <div>
              <label className="label">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-12 w-20 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="input-field flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loyalty System */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Loyalty System</h2>
          
          <div className="mb-4">
            <label className="label">Loyalty Mode</label>
            <div className="flex gap-4">
              <button
                onClick={() => setLoyaltyMode('stamps')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  loyaltyMode === 'stamps'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Stamps
              </button>
              <button
                onClick={() => setLoyaltyMode('points')}
                className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                  loyaltyMode === 'points'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Points
              </button>
            </div>
          </div>

          {loyaltyMode === 'stamps' ? (
            <>
              <div className="mb-4">
                <label className="label">Stamp Ratio</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Rp.</span>
                  <input
                    type="number"
                    value={stampRatioAmount}
                    onChange={(e) => setStampRatioAmount(Number(e.target.value))}
                    className="input-field flex-1"
                  />
                  <span className="text-sm">=</span>
                  <input
                    type="number"
                    value={stampRatioStamps}
                    onChange={(e) => setStampRatioStamps(Number(e.target.value))}
                    className="input-field w-20"
                  />
                  <span className="text-sm">stamp(s)</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMultipleStamps}
                    onChange={(e) => setAllowMultipleStamps(e.target.checked)}
                    className="w-5 h-5 text-primary"
                  />
                  <span className="text-sm">Allow multiple stamps per day</span>
                </label>
              </div>
            </>
          ) : (
            <div>
              <label className="label">Points Ratio</label>
              <div className="flex items-center gap-2">
                <span className="text-sm">Rp.</span>
                <input
                  type="number"
                  value={pointsRatioAmount}
                  onChange={(e) => setPointsRatioAmount(Number(e.target.value))}
                  className="input-field flex-1"
                />
                <span className="text-sm">=</span>
                <input
                  type="number"
                  value={pointsRatioPoints}
                  onChange={(e) => setPointsRatioPoints(Number(e.target.value))}
                  className="input-field w-20"
                />
                <span className="text-sm">point(s)</span>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full"
        >
          <Save className="h-5 w-5 inline mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
