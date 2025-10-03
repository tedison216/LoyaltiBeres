# Translation Implementation Guide

## Current Status

✅ **Infrastructure Ready:**
- Translation dictionary (`lib/i18n/translations.ts`)
- Language context (`lib/i18n/LanguageContext.tsx`)
- Language toggle component (`components/LanguageToggle.tsx`)
- App wrapped in LanguageProvider

⏳ **Needs Implementation:**
- Apply translations to UI text in each page

## How to Implement Translations

### Step 1: Import useLanguage Hook

In any page component, add:
```typescript
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function YourPage() {
  const { t } = useLanguage()
  // ... rest of component
}
```

### Step 2: Replace Hard-coded Text

Replace English text with translation keys:

**Before:**
```typescript
<h1>Customers</h1>
<button>Add Customer</button>
<p>Total members</p>
```

**After:**
```typescript
<h1>{t('customers')}</h1>
<button>{t('addCustomer')}</button>
<p>{t('totalMembers')}</p>
```

## Quick Implementation Examples

### Example 1: Customers Page Header

```typescript
// Already added: import { useLanguage } from '@/lib/i18n/LanguageContext'
// Already added: const { t } = useLanguage()

// Change this:
<h1 className="text-2xl font-bold">Customers</h1>
<p className="text-sm opacity-90">{totalCount} total members</p>

// To this:
<h1 className="text-2xl font-bold">{t('customers')}</h1>
<p className="text-sm opacity-90">{totalCount} {t('totalMembers')}</p>
```

### Example 2: Buttons

```typescript
// Change:
<button>Add</button>
<button>Save</button>
<button>Cancel</button>

// To:
<button>{t('add')}</button>
<button>{t('save')}</button>
<button>{t('cancel')}</button>
```

### Example 3: Form Labels

```typescript
// Change:
<label>Phone Number</label>
<label>Email</label>
<label>Full Name</label>

// To:
<label>{t('phoneNumber')}</label>
<label>{t('email')}</label>
<label>{t('fullName')}</label>
```

## Pages That Need Translation

### Admin Pages (Priority Order)

1. **Admin Dashboard** (`app/admin/page.tsx`)
   - Quick Actions section
   - Stats labels

2. **Customers Page** (`app/admin/customers/page.tsx`) - STARTED ✅
   - Header already has `const { t } = useLanguage()`
   - Just need to replace text with `{t('key')}`

3. **Transactions Page** (`app/admin/transactions/page.tsx`)
   - Tab names: Today, Older, Cancelled
   - Button labels

4. **Redemptions Page** (`app/admin/redemptions/page.tsx`)
   - Status tabs
   - Action buttons

5. **Settings Page** (`app/admin/settings/page.tsx`)
   - Form labels
   - Section headers

### Customer Pages

1. **Customer Home** (`app/customer/page.tsx`)
   - Balance display
   - Navigation

2. **Rewards Page** (`app/customer/rewards/page.tsx`)
   - Reward cards
   - Redemption buttons

3. **History Page** (`app/customer/history/page.tsx`)
   - Tab names
   - Status labels

## Available Translation Keys

All keys are in `lib/i18n/translations.ts`. Here are the main ones:

### Common
- `loading`, `save`, `cancel`, `delete`, `edit`, `add`, `search`, `confirm`
- `back`, `next`, `previous`, `page`, `of`

### Customer Related
- `customers`, `customer`, `addCustomer`, `editCustomer`, `deleteCustomer`
- `customerName`, `fullName`, `phoneNumber`, `totalMembers`, `memberSince`

### Points/Stamps
- `points`, `stamps`, `balance`, `adjustPoints`, `adjustStamps`
- `currentBalance`, `newBalance`, `addPoints`, `subtractPoints`, `amount`

### Transactions
- `transactions`, `transaction`, `addTransaction`, `cancelTransaction`
- `transactionAmount`, `today`, `older`, `cancelled`, `active`

### Redemptions
- `redemptions`, `redemption`, `redemptionCode`, `verify`
- `pending`, `verified`, `noRedemptions`, `verifyRedemption`

### Messages
- `success`, `error`, `confirmDelete`, `cannotUndo`
- `updated`, `deleted`, `added`

## Quick Fix for Customers Page

Since I already added the hook, just update the text:

```typescript
// Find line 476 and change:
<h1 className="text-2xl font-bold">Customers</h1>
// To:
<h1 className="text-2xl font-bold">{t('customers')}</h1>

// Find line 478 and change:
{totalCount} total members
// To:
{totalCount} {t('totalMembers')}

// Find line 510 and change:
Add
// To:
{t('add')}

// Find line 520 and change:
placeholder="Search by name, phone, or email..."
// To:
placeholder={t('search') + '...'}
```

## Adding Language Toggle to Customer Pages

Add to customer page headers:

```typescript
import { LanguageToggle } from '@/components/LanguageToggle'

// In the header section:
<div className="flex items-center gap-2">
  <LanguageToggle />
  {/* other buttons */}
</div>
```

## Testing Translations

1. Click the language toggle (🇬🇧 EN / 🇮🇩 ID)
2. Verify text changes from English to Indonesian
3. Check all pages you've translated

## Full Implementation Estimate

- **Per page:** ~10-15 minutes
- **Total pages:** ~12 pages
- **Total time:** ~2-3 hours

## Recommendation

Start with the most used pages:
1. Admin Dashboard (5 min)
2. Customers Page (10 min) - Already started
3. Transactions Page (10 min)
4. Customer Home (5 min)
5. Rewards Page (10 min)

This covers 80% of user interactions.

## Note

The translation infrastructure is complete and working. The language toggle changes the language state correctly. You just need to replace hard-coded text with `{t('key')}` calls throughout the pages.

Would you like me to complete the translations for specific pages? Let me know which pages are most important to you.
