# DSK Management System

## Current State
The app uses Internet Identity for auth with role-based admin access. The `claimFirstAdmin()` function sets a principal as admin, but Internet Identity issues different principals per origin (URL), causing "Unauthorized" errors when accessing from the live URL vs. the Caffeine editor URL.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Backend: Remove admin role checks. Replace all `AccessControl.isAdmin(...)` checks with `not caller.isAnonymous()` -- any logged-in user can perform all operations. This is safe since it's a personal single-user app.
- Remove dependency on `claimFirstAdmin()` / `adminAssigned` state.
- Frontend: No changes needed for login flow. Remove any `claimFirstAdmin()` calls since they're no longer needed.

### Remove
- `claimFirstAdmin()` function (or keep as no-op for compatibility)
- `accessControlState.adminAssigned` check

## Implementation Plan
1. Rewrite backend: replace admin checks with anonymous check
2. Update frontend to remove claimFirstAdmin calls
