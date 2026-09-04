# Extractable components

## AppShell
- Source: `src/components/layout/app-shell.tsx`
- Category: layout
- Description: desktop-first application shell with logo, navigation and identity footer.
- Extractable props: `section`, `navigation`, `activeItem` (new).
- Hardcoded: Denta Assistant logo treatment, secured-access footer.

## PageHeader
- Source: `src/components/shared/page-header.tsx`
- Category: layout
- Description: page title, short description and optional right action.
- Extractable props: `title`, `description`, `action`.

## MetricCard
- Source: `src/components/dashboard/metric-card.tsx`
- Category: basic
- Description: metric label, value, supporting text and icon tile.
- Extractable props: `icon`, `label`, `value`, `detail`.

## Button, Card, Badge, Avatar
- Source: `src/components/ui/*.tsx`
- Category: basic
- Description: shadcn/Radix design primitives.
- Extractable props: their standard component variant/size props.
