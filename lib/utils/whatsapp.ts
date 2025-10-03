export function formatPhoneForWhatsApp(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '')
    
    // If starts with 0, replace with 62 (Indonesia)
    if (cleaned.startsWith('0')) {
      return '62' + cleaned.substring(1)
    }
    
    // If doesn't start with country code, add 62
    if (!cleaned.startsWith('62')) {
      return '62' + cleaned
    }
    
    return cleaned
  }
  
  /**
   * Generate WhatsApp link with pre-filled message
   */
  export function generateWhatsAppLink(phone: string, message?: string): string {
    const formattedPhone = formatPhoneForWhatsApp(phone)
    const encodedMessage = message ? encodeURIComponent(message) : ''
    
    return `https://wa.me/${formattedPhone}${encodedMessage ? `?text=${encodedMessage}` : ''}`
  }
  
  /**
   * Open WhatsApp in new tab
   */
  export function openWhatsApp(phone: string, message?: string): void {
    const link = generateWhatsAppLink(phone, message)
    window.open(link, '_blank')
  }