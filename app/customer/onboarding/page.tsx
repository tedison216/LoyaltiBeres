'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { UserCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleComplete() {
    if (!fullName) {
      toast.error('Please enter your name')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Check for preregistration
      let restaurantId = null
      const userPhone = phone || session.user.phone
      const userEmail = session.user.email

      if (userPhone || userEmail) {
        const { data: prereg } = await supabase
          .from('customer_preregistrations')
          .select('*')
          .or(`phone.eq.${userPhone},email.eq.${userEmail}`)
          .is('linked_profile_id', null)
          .single()

        if (prereg) {
          restaurantId = prereg.restaurant_id
          // Link the preregistration
          await supabase
            .from('customer_preregistrations')
            .update({ linked_profile_id: session.user.id })
            .eq('id', prereg.id)
        }
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone: phone || existingProfile.phone,
            restaurant_id: restaurantId || existingProfile.restaurant_id,
          })
          .eq('id', session.user.id)

        if (error) throw error
      } else {
        // Create new profile
        const { error } = await supabase.from('profiles').insert({
          id: session.user.id,
          role: 'customer',
          full_name: fullName,
          phone: phone || null,
          email: session.user.email || null,
          restaurant_id: restaurantId,
        })

        if (error) throw error
      }

      toast.success('Welcome! Your profile is set up.')
      router.push('/customer')
    } catch (error: any) {
      console.error('Error completing onboarding:', error)
      toast.error(error.message || 'Failed to complete setup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-secondary flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
            <UserCircle className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome!
          </h1>
          <p className="text-gray-600">
            Let&apos;s set up your profile to get started
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field"
              placeholder="John Doe"
              autoFocus
            />
          </div>

          <div>
            <label className="label">Phone Number (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              placeholder="8123456789"
            />
            <p className="text-xs text-gray-500 mt-1">
              Without country code (e.g., 8123456789)
            </p>
          </div>

          <button
            onClick={handleComplete}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  )
}
