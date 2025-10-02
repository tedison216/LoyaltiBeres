export type LoyaltyMode = 'stamps' | 'points'
export type UserRole = 'customer' | 'admin'
export type RedemptionStatus = 'pending' | 'verified' | 'cancelled'

export interface Restaurant {
  id: string
  name: string
  logo_url: string | null
  theme_primary_color: string
  theme_secondary_color: string
  theme_accent_color: string
  loyalty_mode: LoyaltyMode
  stamp_ratio_amount: number
  stamp_ratio_stamps: number
  allow_multiple_stamps_per_day: boolean
  points_ratio_amount: number
  points_ratio_points: number
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  restaurant_id: string | null
  role: UserRole
  full_name: string | null
  phone: string | null
  email: string | null
  points: number
  stamps: number
  created_at: string
  updated_at: string
}

export interface Reward {
  id: string
  restaurant_id: string
  title: string
  description: string | null
  required_points: number | null
  required_stamps: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Promotion {
  id: string
  restaurant_id: string
  title: string
  description: string | null
  banner_url: string | null
  link_url: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  restaurant_id: string
  customer_id: string
  amount: number
  points_earned: number
  stamps_earned: number
  transaction_date: string
  created_at: string
}

export interface Redemption {
  id: string
  restaurant_id: string
  customer_id: string
  reward_id: string | null
  reward_title: string
  points_used: number
  stamps_used: number
  redemption_code: string
  status: RedemptionStatus
  verified_at: string | null
  verified_by: string | null
  created_at: string
}
