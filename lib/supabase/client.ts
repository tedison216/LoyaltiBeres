import { createClient } from '@supabase/supabase-js'

// Client for browser usage - only uses NEXT_PUBLIC_ variables
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
