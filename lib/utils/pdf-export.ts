import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCustomersForCSV, formatTransactionsForCSV, formatRedemptionsForCSV } from '@/lib/utils/csv-export'
import { Profile } from '@/lib/types/database'

type PDFColumn = {
  header: string
  key: string
  formatter?: (value: any, row: Record<string, any>) => string
}

type PDFMetadataItem = {
  label: string
  value: string
}

type ExportToPDFOptions = {
  data: Record<string, any>[]
  columns: PDFColumn[]
  filename: string
  title: string
  subtitle?: string
  metadata?: PDFMetadataItem[]
  summary?: PDFMetadataItem[]
  orientation?: 'portrait' | 'landscape'
}

function formatValue(value: any) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    return value.toLocaleString()
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toLocaleString()
    }
    return value
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  return String(value)
}

function exportToPDF({ data, columns, filename, title, subtitle, metadata, summary, orientation = 'landscape' }: ExportToPDFOptions) {
  if (!data.length) {
    throw new Error('No data to export')
  }

  const doc = new jsPDF({ orientation })
  let cursorY = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(title, 14, cursorY)
  cursorY += 8

  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(subtitle, 14, cursorY)
    cursorY += 6
  }

  if (metadata?.length) {
    doc.setFontSize(10)
    metadata.forEach((item) => {
      doc.text(`${item.label}: ${item.value}`, 14, cursorY)
      cursorY += 5
    })
    cursorY += 2
  }

  if (summary?.length) {
    doc.setFont('helvetica', 'bold')
    doc.text('Key Figures', 14, cursorY)
    cursorY += 5
    doc.setFont('helvetica', 'normal')
    summary.forEach((item) => {
      doc.text(`${item.label}: ${item.value}`, 18, cursorY)
      cursorY += 5
    })
    cursorY += 3
  }

  const processedData = data.map((row) => {
    const processedRow: Record<string, any> = {}
    columns.forEach((column) => {
      const rawValue = row[column.key]
      const formattedValue = column.formatter ? column.formatter(rawValue, row) : formatValue(rawValue)
      processedRow[column.key] = formattedValue
    })
    return processedRow
  })

  autoTable(doc, {
    startY: Math.max(cursorY, 28),
    margin: { left: 14, right: 14, bottom: 20 },
    columns: columns.map((column) => ({ header: column.header, dataKey: column.key })),
    body: processedData,
    styles: { fontSize: 9, cellPadding: 3, lineWidth: 0.1, lineColor: [225, 232, 240] },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(`Generated on ${new Date().toLocaleString()}`, data.settings.margin.left, pageHeight - 10)
      const pageNumber = doc.getNumberOfPages()
      doc.text(`Page ${pageNumber}`, doc.internal.pageSize.getWidth() - data.settings.margin.right - 20, pageHeight - 10)
    },
  })

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
}

const formatDateTime = (value: any) => {
  if (!value) return ''
  const parsed = Date.parse(value)
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleString()
  }
  return String(value)
}

export function exportCustomersToPDF(customers: Profile[], restaurantName?: string, metadata: PDFMetadataItem[] = [], summary: PDFMetadataItem[] = []) {
  if (!customers.length) {
    throw new Error('No data to export')
  }

  const formatted = formatCustomersForCSV(customers)

  exportToPDF({
    data: formatted,
    columns: [
      { header: 'Customer ID', key: 'id' },
      { header: 'Full Name', key: 'full_name' },
      { header: 'Phone', key: 'phone' },
      { header: 'Email', key: 'email' },
      { header: 'Points', key: 'points' },
      { header: 'Stamps', key: 'stamps' },
      { header: 'Created At', key: 'created_at', formatter: formatDateTime },
    ],
    filename: 'customers',
    title: `${restaurantName ?? 'Restaurant'} Customers Report`,
    subtitle: 'Customer Directory Overview',
    metadata,
    summary,
  })
}

export function exportTransactionsToPDF(transactions: any[], restaurantName?: string, metadata: PDFMetadataItem[] = [], summary: PDFMetadataItem[] = []) {
  if (!transactions.length) {
    throw new Error('No data to export')
  }

  const formatted = formatTransactionsForCSV(transactions)

  exportToPDF({
    data: formatted,
    columns: [
      { header: 'Transaction ID', key: 'id' },
      { header: 'Customer Name', key: 'customer_name' },
      { header: 'Customer Phone', key: 'customer_phone' },
      { header: 'Amount', key: 'amount' },
      { header: 'Points Earned', key: 'points_earned' },
      { header: 'Stamps Earned', key: 'stamps_earned' },
      { header: 'Status', key: 'status' },
      { header: 'Transaction Date', key: 'transaction_date', formatter: formatDateTime },
      { header: 'Created At', key: 'created_at', formatter: formatDateTime },
    ],
    filename: 'transactions',
    title: `${restaurantName ?? 'Restaurant'} Transactions Report`,
    subtitle: 'Financial Activity Summary',
    metadata,
    summary,
  })
}

export function exportRedemptionsToPDF(redemptions: any[], restaurantName?: string, metadata: PDFMetadataItem[] = [], summary: PDFMetadataItem[] = []) {
  if (!redemptions.length) {
    throw new Error('No data to export')
  }

  const formatted = formatRedemptionsForCSV(redemptions)

  exportToPDF({
    data: formatted,
    columns: [
      { header: 'Redemption ID', key: 'id' },
      { header: 'Customer Name', key: 'customer_name' },
      { header: 'Customer Phone', key: 'customer_phone' },
      { header: 'Reward Title', key: 'reward_title' },
      { header: 'Points Used', key: 'points_used' },
      { header: 'Stamps Used', key: 'stamps_used' },
      { header: 'Redemption Code', key: 'redemption_code' },
      { header: 'Status', key: 'status' },
      { header: 'Verified At', key: 'verified_at', formatter: formatDateTime },
      { header: 'Created At', key: 'created_at', formatter: formatDateTime },
    ],
    filename: 'redemptions',
    title: `${restaurantName ?? 'Restaurant'} Redemptions Report`,
    subtitle: 'Reward Fulfilment Summary',
    metadata,
    summary,
  })
}

export type { PDFMetadataItem }
