'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Mail, Phone, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')

  async function handleCustomerLogin() {
    if (!phone && !email) {
      toast.error('Please enter your phone number or email')
      return
    }

    setLoading(true)
    try {
      if (phone) {
        // Send OTP to phone
        const { error } = await supabase.auth.signInWithOtp({
          phone: phone.startsWith('+') ? phone : `+62${phone}`,
        })
        
        if (error) throw error
        
        toast.success('OTP sent to your phone!')
        setOtpSent(true)
      } else {
        // Send magic link to email
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        
        if (error) throw error
        
        toast.success('Check your email for the login link!')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send login code')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otp) {
      toast.error('Please enter the OTP code')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.startsWith('+') ? phone : `+62${phone}`,
        token: otp,
        type: 'sms',
      })
      
      if (error) throw error
      
      // Check if profile exists, if not create one
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single()

      if (!profile) {
        await supabase.from('profiles').insert({
          id: data.user?.id,
          role: 'customer',
          phone: phone,
        })
      }

      toast.success('Login successful!')
      router.push('/customer')
    } catch (error: any) {
      toast.error(error.message || 'Invalid OTP code')
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
            {!otpSent ? (
              <>
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

                <div className="text-center text-sm text-gray-500">OR</div>

                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCustomerLogin}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Sending...' : 'Send Login Code'}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="label">Enter OTP Code</label>
                  <input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="input-field"
                    maxLength={6}
                  />
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>

                <button
                  onClick={() => setOtpSent(false)}
                  className="btn-secondary w-full"
                >
                  Back
                </button>
              </>
            )}
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
