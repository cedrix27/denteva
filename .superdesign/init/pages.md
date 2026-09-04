# Component dependency trees

## `/cabinet`
Entry: `src/app/(app)/cabinet/page.tsx`

- `src/components/shared/page-header.tsx`
  - `src/components/ui/button.tsx`
  - `src/lib/utils.ts`
- `src/components/dashboard/cabinet-dashboard.tsx`
  - `src/components/dashboard/metric-card.tsx`
    - `src/components/ui/card.tsx`
  - `src/components/ui/badge.tsx`
  - `src/components/ui/card.tsx`
- `src/app/(app)/cabinet/layout.tsx`
  - `src/components/layout/app-shell.tsx`
    - `src/components/ui/avatar.tsx`
    - `src/components/ui/badge.tsx`
    - `src/lib/navigation.ts`

## `/cabinet/inbox`
Entry: `src/app/(app)/cabinet/inbox/page.tsx`

- `src/components/shared/page-header.tsx`
- `src/components/shared/section-placeholder.tsx`
  - `src/components/ui/card.tsx`
- `src/app/(app)/cabinet/layout.tsx`
  - `src/components/layout/app-shell.tsx`

## `/cabinet/appointments`, `/cabinet/patients`, `/cabinet/settings`
Each entry imports `PageHeader` + `SectionPlaceholder` and inherits the cabinet `AppShell` layout.

## `/admin`
Entry: `src/app/(app)/admin/page.tsx`

- `src/components/shared/page-header.tsx`
- `src/components/dashboard/admin-dashboard.tsx`
  - `src/components/dashboard/metric-card.tsx`
  - `src/components/ui/card.tsx`
- `src/app/(app)/admin/layout.tsx`
  - `src/components/layout/app-shell.tsx`
