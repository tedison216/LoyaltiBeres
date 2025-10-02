'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile, Restaurant, Reward } from '@/lib/types/database'
import { ArrowLeft, Plus, Edit, Trash2, Award, Gift } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RewardsManagementPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requiredAmount, setRequiredAmount] = useState(10)

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

        const { data: rewardsData } = await supabase
          .from('rewards')
          .select('*')
          .eq('restaurant_id', profileData.restaurant_id)
          .order('created_at', { ascending: false })

        if (rewardsData) {
          setRewards(rewardsData)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load rewards')
    } finally {
      setLoading(false)
    }
  }

  function handleEdit(reward: Reward) {
    setEditingReward(reward)
    setTitle(reward.title)
    setDescription(reward.description || '')
    setRequiredAmount(
      restaurant?.loyalty_mode === 'stamps'
        ? reward.required_stamps || 10
        : reward.required_points || 10
    )
    setShowForm(true)
  }

  function handleNew() {
    setEditingReward(null)
    setTitle('')
    setDescription('')
    setRequiredAmount(10)
    setShowForm(true)
  }

  async function handleSave() {
    if (!restaurant || !title) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const isStampMode = restaurant.loyalty_mode === 'stamps'
      const rewardData = {
        restaurant_id: restaurant.id,
        title,
        description,
        required_stamps: isStampMode ? requiredAmount : null,
        required_points: isStampMode ? null : requiredAmount,
        is_active: true,
      }

      if (editingReward) {
        const { error } = await supabase
          .from('rewards')
          .update(rewardData)
          .eq('id', editingReward.id)

        if (error) throw error
        toast.success('Reward updated successfully!')
      } else {
        const { error } = await supabase
          .from('rewards')
          .insert(rewardData)

        if (error) throw error
        toast.success('Reward created successfully!')
      }

      setShowForm(false)
      loadData()
    } catch (error: any) {
      console.error('Error saving reward:', error)
      toast.error(error.message || 'Failed to save reward')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this reward?')) return

    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Reward deleted successfully!')
      loadData()
    } catch (error: any) {
      console.error('Error deleting reward:', error)
      toast.error(error.message || 'Failed to delete reward')
    }
  }

  async function toggleActive(reward: Reward) {
    try {
      const { error } = await supabase
        .from('rewards')
        .update({ is_active: !reward.is_active })
        .eq('id', reward.id)

      if (error) throw error

      toast.success(`Reward ${reward.is_active ? 'deactivated' : 'activated'}!`)
      loadData()
    } catch (error: any) {
      console.error('Error toggling reward:', error)
      toast.error(error.message || 'Failed to update reward')
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
              {editingReward ? 'Edit Reward' : 'New Reward'}
            </h1>
          </div>
        </div>

        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="label">Reward Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Free Tenderloin Steak"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Enjoy a complimentary tenderloin steak..."
            />
          </div>

          <div>
            <label className="label">
              Required {restaurant?.loyalty_mode === 'stamps' ? 'Stamps' : 'Points'} *
            </label>
            <input
              type="number"
              value={requiredAmount}
              onChange={(e) => setRequiredAmount(Number(e.target.value))}
              className="input-field"
              min="1"
            />
          </div>

          <button onClick={handleSave} className="btn-primary w-full">
            {editingReward ? 'Update Reward' : 'Create Reward'}
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
            <h1 className="text-2xl font-bold">Rewards</h1>
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
        {rewards.length === 0 ? (
          <div className="card text-center py-12">
            <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No rewards yet</p>
            <button onClick={handleNew} className="btn-primary">
              Create First Reward
            </button>
          </div>
        ) : (
          rewards.map((reward) => (
            <div
              key={reward.id}
              className={`card ${!reward.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{reward.title}</h3>
                  {reward.description && (
                    <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    {restaurant?.loyalty_mode === 'stamps' ? (
                      <>
                        <Award className="h-5 w-5" />
                        <span>{reward.required_stamps} stamps</span>
                      </>
                    ) : (
                      <>
                        <Gift className="h-5 w-5" />
                        <span>{reward.required_points} points</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    reward.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {reward.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(reward)}
                  className="flex-1 btn-secondary"
                >
                  <Edit className="h-4 w-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => toggleActive(reward)}
                  className="flex-1 btn-outline"
                >
                  {reward.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(reward.id)}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
