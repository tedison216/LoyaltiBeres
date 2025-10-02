'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Profile } from '@/lib/types/database'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
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
      router.push('/auth/login')
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

  return null
}
