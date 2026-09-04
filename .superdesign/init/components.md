# Shared components

## `src/components/ui/button.tsx`
Button primitive; variants: default, outline, secondary, ghost, destructive, link; sizes xs through lg.

```tsx
const buttonVariants = cva("group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { default: "bg-primary text-primary-foreground hover:bg-primary/80", outline: "border-border bg-background hover:bg-muted", secondary: "bg-secondary text-secondary-foreground", ghost: "hover:bg-muted", destructive: "bg-destructive/10 text-destructive", link: "text-primary underline-offset-4 hover:underline" }, size: { default: "h-8 gap-1.5 px-2.5", xs: "h-6 gap-1 px-2 text-xs", sm: "h-7 gap-1 px-2.5 text-[0.8rem]", lg: "h-9 gap-1.5 px-2.5", icon: "size-8", "icon-xs": "size-6", "icon-sm": "size-7", "icon-lg": "size-9" } }, defaultVariants: { variant: "default", size: "default" } })
function Button({ className, variant = "default", size = "default", asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) { const Comp = asChild ? Slot.Root : "button"; return <Comp data-slot="button" data-variant={variant} data-size={size} className={cn(buttonVariants({ variant, size, className }))} {...props} /> }
```

## `src/components/ui/card.tsx`
Card composition primitive: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction`.

```tsx
function Card({ className, size = "default", ...props }: React.ComponentProps<"div"> & { size?: "default" | "sm" }) { return <div data-slot="card" data-size={size} className={cn("group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)]", className)} {...props} /> }
function CardHeader({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-header" className={cn("group/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing)", className)} {...props} /> }
function CardTitle({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-title" className={cn("font-heading text-base leading-snug font-medium", className)} {...props} /> }
function CardDescription({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} /> }
function CardContent({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="card-content" className={cn("px-(--card-spacing)", className)} {...props} /> }
```

## `src/components/ui/badge.tsx`
Small pill status primitive; variants default, secondary, destructive, outline, ghost and link.

```tsx
function Badge({ className, variant = "default", asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) { const Comp = asChild ? Slot.Root : "span"; return <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} /> }
```

## `src/components/ui/avatar.tsx`
Radix avatar composition: `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`; supports `sm`, default and `lg` sizes.

## `src/components/ui/separator.tsx`
Radix separator primitive with horizontal/vertical orientation.

## `src/components/ui/skeleton.tsx`
`Skeleton` is an animated muted rounded rectangle.

## `src/components/ui/tooltip.tsx`
Radix composition: `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`.
