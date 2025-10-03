'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Mail, Phone, Lock, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminToggle, setShowAdminToggle] = useState(false)
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('') // For admin login only
  const [password, setPassword] = useState('') // For admin login only
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if coming from admin link
    const role = searchParams.get('role')
    if (role === 'admin') {
      setIsAdmin(true)
      setShowAdminToggle(true)
    }
  }, [searchParams])

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

        // Check if this is first time login (temp profile)
        if (profile.is_temp) {
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

          // Delete old temp profile
          await supabase
            .from('profiles')
            .delete()
            .eq('phone', phone)
            .eq('is_temp', true)

          // Create new profile with real auth ID
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: signUpData.user!.id,
              restaurant_id: profile.restaurant_id,
              role: 'customer',
              full_name: profile.full_name,
              phone: phone,
              email: profile.email,
              pin: pin,
              is_temp: false,
            })
          
          if (insertError) {
            console.error('Error creating profile:', insertError)
            throw insertError
          }

          console.log('Profile created with auth ID:', signUpData.user!.id)
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
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => router.push('/')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to home"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Irba Steak
          </h1>
          </div>
          <p className="text-gray-600 mb-6">
            {isAdmin ? 'Admin Login' : 'Loyalty Program'}
          </p>
        {showAdminToggle && (
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
        )}

        {!isAdmin ? (
          // Customer Login Form
          <div className="space-y-4">
            <div>
              <label className="label">Phone Number / Nomor Telepon</label>
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
                Enter without country code / Masukkan tanpa kode negara (e.g., 8123456789)
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
                Ask the restaurant for your PIN / Tanya restoran untuk PIN Anda
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
