# Layout components

## `src/components/layout/app-shell.tsx`
Shared cabinet/admin app shell: dark 250px sidebar, logo, section badge, navigation and user identity footer. Renders page content as `children`.

```tsx
export function AppShell({ children, navigation, section }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f5f8fa] lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="flex min-h-screen flex-col bg-slate-950 px-4 py-5 text-slate-300">
        <Link className="flex items-center gap-3 px-2" href="/cabinet">
          <span className="flex size-9 items-center justify-center rounded-xl bg-teal-600 text-white"><Bot className="size-5" /></span>
          <span className="text-base font-semibold tracking-tight text-white">Denta Assistant</span>
        </Link>
        <div className="mt-8 px-2"><Badge className="bg-teal-950 text-teal-300 hover:bg-teal-950">{section}</Badge></div>
        <nav className="mt-4 space-y-1">{navigation.map(({ href, icon: Icon, label }) => <Link className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium", href === "/cabinet" || href === "/admin" ? "bg-white/10 text-white" : "text-slate-400")} href={href} key={href}><Icon className="size-4" />{label}</Link>)}</nav>
        <div className="mt-auto space-y-4 border-t border-white/10 pt-5">{/* avatar and secure access */}</div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  )
}
```

## `src/components/shared/page-header.tsx`
Shared page title, description and optional disabled action button for the current skeleton.

## Root layout `src/app/layout.tsx`
Root metadata, Geist font variables, French document language and global CSS import.
