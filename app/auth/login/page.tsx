'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Mail, Phone, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('') // For admin login only
  const [password, setPassword] = useState('') // For admin login only
  const [loading, setLoading] = useState(false)

  async function handleCustomerLogin() {
    if (!phone || !pin) {
      toast.error('Please enter your phone number and PIN')
      return
    }

    setLoading(true)
    try {
        // Check if customer exists in profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', phone)
          .eq('role', 'customer')
          .single()

        if (profileError || !profile) {
          toast.error('Phone number not found. Please contact the restaurant.')
          setLoading(false)
          return
        }

        if (profile.pin !== pin) {
          toast.error('Incorrect PIN')
          setLoading(false)
          return
        }

        // Check if profile has temp ID (starts with 'temp_')
        if (profile.id.startsWith('temp_')) {
          // First time login - create auth user and update profile
          const generatedEmail = `${phone.replace(/\D/g, '')}@customer.local`
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: generatedEmail,
            password: pin + phone,
            options: {
              data: {
                phone: phone,
              }
            }
          })

          if (signUpError) throw signUpError

          // Update profile with real auth ID
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ id: signUpData.user!.id })
            .eq('phone', phone)
          
          if (updateError) {
            console.error('Error updating profile:', updateError)
            throw updateError
          }

          console.log('Profile updated with auth ID:', signUpData.user!.id)
        } else {
          // Returning user - sign in
          const generatedEmail = `${phone.replace(/\D/g, '')}@customer.local`
          
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: generatedEmail,
            password: pin + phone,
          })

          if (signInError) throw signInError
        }

      toast.success('Login successful!')
      router.push('/customer')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }


  async function handleAdminLogin() {
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error

      // Verify admin role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Unauthorized: Admin access only')
      }

      toast.success('Welcome back!')
      router.push('/admin')
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light to-secondary flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Restaurant Loyalty
          </h1>
          <p className="text-gray-600">
            {isAdmin ? 'Admin Login' : 'Customer Login'}
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsAdmin(false)}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              !isAdmin
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Customer
          </button>
          <button
            onClick={() => setIsAdmin(true)}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              isAdmin
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Admin
          </button>
        </div>

        {!isAdmin ? (
          // Customer Login Form
          <div className="space-y-4">
            <div>
              <label className="label">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="8123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter without country code (e.g., 8123456789)
              </p>
            </div>

            <div>
              <label className="label">PIN</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="Enter your 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="input-field pl-10"
                  maxLength={4}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ask the restaurant for your PIN
              </p>
            </div>

            <button
              onClick={handleCustomerLogin}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        ) : (
          // Admin Login Form
          <div className="space-y-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="admin@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            <button
              onClick={handleAdminLogin}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
