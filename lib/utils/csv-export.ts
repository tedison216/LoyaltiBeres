import { Profile, Transaction, Redemption } from '@/lib/types/database'

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    throw new Error('No data to export')
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle nested objects and arrays
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""')
        // Escape commas and quotes
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function formatCustomersForCSV(customers: Profile[]) {
  return customers.map(customer => ({
    id: customer.id,
    full_name: customer.full_name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    points: customer.points,
    stamps: customer.stamps,
    created_at: customer.created_at,
  }))
}

export function formatTransactionsForCSV(transactions: any[]) {
  return transactions.map(transaction => ({
    id: transaction.id,
    customer_name: transaction.customer?.full_name || '',
    customer_phone: transaction.customer?.phone || '',
    amount: transaction.amount,
    points_earned: transaction.points_earned,
    stamps_earned: transaction.stamps_earned,
    status: transaction.status,
    transaction_date: transaction.transaction_date,
    created_at: transaction.created_at,
  }))
}

export function formatRedemptionsForCSV(redemptions: any[]) {
  return redemptions.map(redemption => ({
    id: redemption.id,
    customer_name: redemption.customer?.full_name || '',
    customer_phone: redemption.customer?.phone || '',
    reward_title: redemption.reward_title,
    points_used: redemption.points_used,
    stamps_used: redemption.stamps_used,
    redemption_code: redemption.redemption_code,
    status: redemption.status,
    verified_at: redemption.verified_at || '',
    created_at: redemption.created_at,
  }))
}

export function parseCSVToCustomers(csvText: string): Partial<Profile>[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid')
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const customers: Partial<Profile>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const customer: Partial<Profile> = {}

    headers.forEach((header, index) => {
      const value = values[index]
      if (!value) return

      switch (header) {
        case 'full_name':
        case 'name':
          customer.full_name = value
          break
        case 'phone':
        case 'phone_number':
          customer.phone = value
          break
        case 'email':
          customer.email = value
          break
        case 'points':
          customer.points = parseInt(value) || 0
          break
        case 'stamps':
          customer.stamps = parseInt(value) || 0
          break
      }
    })

    if (customer.full_name || customer.phone || customer.email) {
      customers.push(customer)
    }
  }

  return customers
}
