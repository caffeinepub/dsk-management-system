# DSK Management System

## Current State
The app has a full customer management system with CRUD operations, expense tracking, document library, profit summaries, and renewal alerts. The backend stores customers, expenses, and document library items. The CustomerDetail page shows financials but has no renewal history or renewal processing form.

## Requested Changes (Diff)

### Add
- `RenewalRecord` type in backend with fields: id, customerId, serviceName, renewalDate, nextExpiryDate, govtFees, serviceCharge, totalCharged, advancePaid, balanceDue, documentBlob (ExternalBlob optional)
- `addRenewalRecord` backend method: inserts renewal, updates customer expiryDate + balanceDue + status to completed, adds serviceCharge to profit
- `getCustomerRenewalHistory` query: returns all renewal records for a customer by tokenId
- `RenewalModal` frontend component: triggered from CustomerDetail and CustomerList "Renew" button; includes manual date picker for nextExpiryDate, govtFees, serviceCharge fields, auto-calculated total, advancePaid, balanceDue fields, file upload (.pdf/.jpg/.png) via blob-storage
- "Service & Payment History" table section in CustomerDetail below financials: columns Date | Service | Total Charged | Profit | Balance | Document Link
- Document links open files directly (proper Content-Type headers via blob-storage getDirectURL)
- Renewal action button on CustomerList and CustomerDetail pages

### Modify
- `getProfitSummary` backend: include serviceCharge from renewal records in profit calculations
- CustomerDetail page: add "Renew" button and history section below existing cards
- CustomerList page: add "Renew" button in actions column
- Dashboard profit metrics will automatically reflect renewal profits via updated getProfitSummary

### Remove
- Nothing removed

## Implementation Plan
1. Update backend main.mo: add RenewalRecord type, renewalHistory map, addRenewalRecord (update customer + profit), getCustomerRenewalHistory, update getProfitSummary to include renewal service charges
2. Regenerate backend bindings
3. Add RenewalModal component with date picker, financial inputs, file upload
4. Update CustomerDetail to show Renew button, open modal, and show history ledger table
5. Update CustomerList to show Renew button in actions
6. Ensure document files open with proper content-type (use blob getDirectURL for direct browser view)
