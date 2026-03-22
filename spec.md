# DSK Management System

## Current State
The backend stores all data (customers, expenses, document library, custom services) in non-stable Map variables. This means every canister upgrade (new deployment) wipes all data. Counter variables are also not stable.

## Requested Changes (Diff)

### Add
- `stable var` arrays for all data collections (customers, expenses, documentLibrary, customServices)
- `stable var` for counter variables (customerCount, expenseCount, docCount)
- `system func preupgrade()` to save all Map data to stable arrays before upgrade
- `system func postupgrade()` to restore Map data from stable arrays after upgrade, then clear stable arrays to free memory

### Modify
- All data maps initialized from stable arrays on startup instead of always empty

### Remove
- Nothing

## Implementation Plan
1. Add stable backing arrays for each Map
2. Make counter variables stable
3. Initialize maps from stable arrays
4. Add preupgrade/postupgrade system hooks to persist data across upgrades
