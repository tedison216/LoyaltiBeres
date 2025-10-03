import { supabase } from '@/lib/supabase/client'

export type ActionType = 
  | 'points_adjustment'
  | 'transaction_cancelled'
  | 'customer_deleted'
  | 'customer_created'
  | 'customer_updated'
  | 'transaction_deleted'
  | 'redemption_verified'
  | 'redemption_cancelled'
  | 'bulk_delete'
  | 'csv_import'

export async function logActivity(
  restaurantId: string,
  performedBy: string,
  actionType: ActionType,
  targetType?: string,
  targetId?: string,
  details?: Record<string, any>
) {
  try {
    const { error } = await supabase.from('activity_logs').insert({
      restaurant_id: restaurantId,
      performed_by: performedBy,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      details: details || null,
    })

    if (error) {
      console.error('Failed to log activity:', error)
    }
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}
