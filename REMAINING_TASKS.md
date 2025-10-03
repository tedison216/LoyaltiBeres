# Remaining Tasks

## ✅ Just Completed
1. **Analytics Dashboard** - `app/admin/analytics/page.tsx` ✅
2. **Activity Logs Viewer** - `app/admin/activity-logs/page.tsx` ✅

## ⏳ Still Need to Complete

### 1. Add CSV Template Download to Customers Page
**File:** `app/admin/customers/page.tsx`

Add this button next to the CSV import button:

```typescript
<button
  onClick={downloadCSVTemplate}
  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
  title="Download CSV Template"
>
  <Download className="h-5 w-5" />
  Template
</button>

// Add this function:
function downloadCSVTemplate() {
  const template = [
    ['full_name', 'phone', 'email', 'pin'],
    ['John Doe', '8123456789', 'john@example.com', '1234'],
    ['Jane Smith', '8198765432', '', ''],  // email optional
    ['Bob Wilson', '8187654321', 'bob@example.com', ''],  // pin will auto-generate
  ]
  
  const csvContent = template.map(row => row.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'customer_import_template.csv'
  link.click()
  URL.revokeObjectURL(url)
}
```

### 2. Update Admin Dashboard Navigation
**File:** `app/admin/page.tsx`

Add these navigation cards:

```typescript
// Add to the dashboard cards:
<Link href="/admin/analytics" className="card hover:shadow-lg transition-shadow">
  <div className="flex items-center gap-4">
    <div className="p-3 bg-purple-100 rounded-lg">
      <TrendingUp className="h-6 w-6 text-purple-600" />
    </div>
    <div>
      <h3 className="font-semibold">Analytics</h3>
      <p className="text-sm text-gray-600">View insights</p>
    </div>
  </div>
</Link>

<Link href="/admin/activity-logs" className="card hover:shadow-lg transition-shadow">
  <div className="flex items-center gap-4">
    <div className="p-3 bg-orange-100 rounded-lg">
      <FileText className="h-6 w-6 text-orange-600" />
    </div>
    <div>
      <h3 className="font-semibold">Activity Logs</h3>
      <p className="text-sm text-gray-600">Audit trail</p>
    </div>
  </div>
</Link>

<Link href="/admin/data-management" className="card hover:shadow-lg transition-shadow">
  <div className="flex items-center gap-4">
    <div className="p-3 bg-blue-100 rounded-lg">
      <Database className="h-6 w-6 text-blue-600" />
    </div>
    <div>
      <h3 className="font-semibold">Data Management</h3>
      <p className="text-sm text-gray-600">Export & cleanup</p>
    </div>
  </div>
</Link>
```

Don't forget to import the icons:
```typescript
import { TrendingUp, FileText, Database } from 'lucide-react'
```

### 3. Optional: Add Language Toggle to Admin Pages
Add to any admin page header where you want language switching.

---

## 📋 Quick Checklist

- [ ] Add CSV template download button to customers page
- [ ] Add downloadCSVTemplate function to customers page
- [ ] Add Analytics link to admin dashboard
- [ ] Add Activity Logs link to admin dashboard
- [ ] Add Data Management link to admin dashboard
- [ ] Import necessary icons in admin dashboard
- [ ] Test CSV template download
- [ ] Test navigation to all new pages

---

## 🎯 Summary

**Completed Today:**
- ✅ Translation system (EN/ID)
- ✅ Activity logging system
- ✅ CSV export/import utilities
- ✅ Data Management page
- ✅ Enhanced Customers page (search, CSV)
- ✅ Enhanced Transactions page (logging)
- ✅ Settings page (max redemptions)
- ✅ Redemption warnings
- ✅ Hidden admin login
- ✅ **Analytics Dashboard** (NEW!)
- ✅ **Activity Logs Viewer** (NEW!)

**Remaining (15 minutes):**
- ⏳ CSV template download (5 min)
- ⏳ Admin dashboard navigation (10 min)

Almost there! Just need to add the template download and update the dashboard navigation.
