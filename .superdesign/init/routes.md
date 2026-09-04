# App Router route map

| URL | Entry file | Shared layout | Current content |
| --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | root | Redirects to `/cabinet` |
| `/cabinet` | `src/app/(app)/cabinet/page.tsx` | `cabinet/layout.tsx` → `AppShell` | Cabinet dashboard |
| `/cabinet/inbox` | `src/app/(app)/cabinet/inbox/page.tsx` | cabinet | Placeholder inbox |
| `/cabinet/appointments` | `src/app/(app)/cabinet/appointments/page.tsx` | cabinet | Placeholder calendar |
| `/cabinet/patients` | `src/app/(app)/cabinet/patients/page.tsx` | cabinet | Placeholder patients |
| `/cabinet/settings` | `src/app/(app)/cabinet/settings/page.tsx` | cabinet | Placeholder settings |
| `/admin` | `src/app/(app)/admin/page.tsx` | `admin/layout.tsx` → `AppShell` | Internal platform dashboard |
| `/admin/cabinets` | `src/app/(app)/admin/cabinets/page.tsx` | admin | Placeholder cabinets |
| `/admin/onboarding` | `src/app/(app)/admin/onboarding/page.tsx` | admin | Placeholder onboarding |
| `/admin/activity` | `src/app/(app)/admin/activity/page.tsx` | admin | Placeholder activity |
