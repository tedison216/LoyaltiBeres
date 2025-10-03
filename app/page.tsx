'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/lib/types/database'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [showLanding, setShowLanding] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  // Remove keyboard shortcut - using button instead

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // No session, show landing page
        setShowLanding(true)
        setLoading(false)
        return
      }

      // Get user profile to determine role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single()

      // If no profile exists or profile is incomplete, go to onboarding
      if (error || !profile) {
        router.push('/customer/onboarding')
        return
      }

      // If profile exists but no name, go to onboarding
      if (!profile.full_name && profile.role === 'customer') {
        router.push('/customer/onboarding')
        return
      }

      if (profile.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/customer')
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setShowLanding(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (showLanding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary to-secondary p-6 relative">
        <div className="text-center text-white mb-8">
          <h1 className="text-5xl font-bold mb-4">Irba Steak</h1>
          <p className="text-xl opacity-90">Loyalty Program</p>
        </div>
        
        <Link 
          href="/auth/login"
          className="bg-white text-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-lg"
        >
          Customer Login
        </Link>
        
        {/* Small subtle admin button at bottom */}
        <Link
          href="/auth/login?role=admin"
          className="absolute bottom-4 right-4 text-white/30 hover:text-white/50 text-xs transition-colors"
        >
          admin
        </Link>
      </div>
    )
  }

  return null
}
