# Search Fix Guide - Database-wide Search

## Problem
Search currently only filters the loaded page results, not the entire database.

## Solution
Modify the query to include search filters when fetching from database.

## Fix for Customers Page

### Step 1: Update the customers query section

Find this code (around line 110-119):
```typescript
const { data: customersData, error: customersError, count } = await supabase
  .from('profiles')
  .select('*', { count: 'exact' })
  .eq('restaurant_id', profileData.restaurant_id)
  .eq('role', 'customer')
  .order('created_at', { ascending: false })
  .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)
```

Replace with:
```typescript
// Build query with search filters
let query = supabase
  .from('profiles')
  .select('*', { count: 'exact' })
  .eq('restaurant_id', profileData.restaurant_id)
  .eq('role', 'customer')

// Add search filters if search query exists
if (searchQuery) {
  query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
}

const { data: customersData, error: customersError, count } = await query
  .order('created_at', { ascending: false })
  .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1)
```

### Step 2: Remove the client-side filtering

Delete the `filteredCustomers` state and its useEffect:
```typescript
// DELETE THIS:
const [filteredCustomers, setFilteredCustomers] = useState<Profile[]>([])

// DELETE THIS useEffect too (it's no longer needed)
```

### Step 3: Update the UI to use `customers` directly

Find where `filteredCustomers` is used in the JSX (around line 740):
```typescript
{filteredCustomers.length === 0 ? (
  // ...
) : (
  filteredCustomers.map((customer) => (
```

Replace with:
```typescript
{customers.length === 0 ? (
  // ...
) : (
  customers.map((customer) => (
```

### Step 4: Reset to page 1 when searching

Add this to handle search changes:
```typescript
function handleSearchChange(value: string) {
  setSearchQuery(value)
  setCurrentPage(1) // Reset to first page when searching
}
```

Then update the search input:
```typescript
<input
  type="text"
  value={searchQuery}
  onChange={(e) => handleSearchChange(e.target.value)}
  placeholder="Search by name, phone, or email..."
  className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-900"
/>
```

## Result

✅ Search now queries the entire database
✅ Results show across all pages
✅ Pagination works with search results
✅ Resets to page 1 when searching

## Apply Same Fix to Other Pages

Use the same pattern for:
- Transactions page
- Redemptions page
- Any other page with search + pagination

## Example for Transactions

```typescript
let query = supabase
  .from('transactions')
  .select('*, customer:profiles!transactions_customer_id_fkey(full_name, phone)', { count: 'exact' })
  .eq('restaurant_id', profileData.restaurant_id)

if (searchQuery) {
  // Search in customer name or phone
  query = query.or(`customer.full_name.ilike.%${searchQuery}%,customer.phone.ilike.%${searchQuery}%`)
}

const { data, error, count } = await query
  .order('created_at', { ascending: false })
  .range(from, to)
```

## Testing

1. Go to Customers page
2. Enter search term (e.g., "John")
3. Should see all Johns from entire database, not just current page
4. Pagination should work with filtered results
5. Clear search to see all customers again
