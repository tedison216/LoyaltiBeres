## Step 2: Update Promotions Page

Add to `app/admin/promotions/page.tsx`:

### A. Add imports and state:

```typescript
import { MessageCircle, Search, X } from 'lucide-react'
import { generateWhatsAppLink, openWhatsApp } from '@/lib/utils/whatsapp'

// Add these state variables:
const [showCustomerSearch, setShowCustomerSearch] = useState(false)
const [customers, setCustomers] = useState<Profile[]>([])
const [searchQuery, setSearchQuery] = useState('')
const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
```

### B. Add customer loading function:

```typescript
async function loadCustomers() {
  if (!restaurant) return
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('role', 'customer')
    .order('full_name')
  
  if (error) {
    console.error('Error loading customers:', error)
    return
  }
  
  setCustomers(data || [])
}
```

### C. Add function to open customer search:

```typescript
function openCustomerSearch(promotion: Promotion) {
  setSelectedPromotion(promotion)
  setShowCustomerSearch(true)
  loadCustomers()
}

function handleSendWhatsApp(customer: Profile) {
  if (!selectedPromotion) return
  
  // Create message with promotion details
  const message = `Hi ${customer.full_name}! 🎉\n\n` +
    `Check out our promotion: *${selectedPromotion.title}*\n\n` +
    `${selectedPromotion.description}\n\n` +
    `${selectedPromotion.link_url ? `More info: ${selectedPromotion.link_url}` : ''}`
  
  openWhatsApp(customer.phone, message)
  setShowCustomerSearch(false)
  toast.success(`Opening WhatsApp for ${customer.full_name}`)
}
```

### D. Add WhatsApp button to promotion cards:

Find the promotion card section and add this button:

```typescript
<button
  onClick={() => openCustomerSearch(promotion)}
  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
  title="Send via WhatsApp"
>
  <MessageCircle className="h-5 w-5" />
</button>
```

### E. Add Customer Search Modal (add before closing div):

```typescript
{/* Customer Search Modal */}
{showCustomerSearch && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-bold">Send to Customer</h2>
        <button
          onClick={() => setShowCustomerSearch(false)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            autoFocus
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto p-4">
        {customers
          .filter(c => {
            const query = searchQuery.toLowerCase()
            return (
              c.full_name?.toLowerCase().includes(query) ||
              c.phone?.toLowerCase().includes(query) ||
              c.email?.toLowerCase().includes(query)
            )
          })
          .map(customer => (
            <button
              key={customer.id}
              onClick={() => handleSendWhatsApp(customer)}
              className="w-full p-3 hover:bg-gray-50 rounded-lg transition-colors text-left mb-2 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold">{customer.full_name}</p>
                  <p className="text-sm text-gray-600">{customer.phone}</p>
                </div>
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
            </button>
          ))}
        
        {customers.filter(c => {
          const query = searchQuery.toLowerCase()
          return (
            c.full_name?.toLowerCase().includes(query) ||
            c.phone?.toLowerCase().includes(query)
          )
        }).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No customers found
          </div>
        )}
      </div>

      {/* Promotion Preview */}
      {selectedPromotion && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 mb-1">Sending promotion:</p>
          <p className="font-semibold text-sm">{selectedPromotion.title}</p>
        </div>
      )}
    </div>
  </div>
)}
```