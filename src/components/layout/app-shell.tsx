import type { ReactNode } from "react";
import Link from "next/link";
import { Bot, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = { children: ReactNode; navigation: NavigationItem[]; section: "Cabinet" | "Administration" };

export function AppShell({ children, navigation, section }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f5f8fa] lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="flex min-h-screen flex-col bg-slate-950 px-4 py-5 text-slate-300">
        <Link className="flex items-center gap-3 px-2" href="/cabinet">
          <span className="flex size-9 items-center justify-center rounded-xl bg-teal-600 text-white"><Bot className="size-5" /></span>
          <span className="text-base font-semibold tracking-tight text-white">Denteva</span>
        </Link>
        <div className="mt-8 px-2"><Badge className="bg-teal-950 text-teal-300 hover:bg-teal-950">{section}</Badge></div>
        <nav className="mt-4 space-y-1" aria-label={`Navigation ${section.toLowerCase()}`}>
          {navigation.map(({ href, icon: Icon, label }) => (
            <Link
              className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/10 hover:text-white", href === "/cabinet" || href === "/admin" ? "bg-white/10 text-white" : "text-slate-400")}
              href={href}
              key={href}
            >
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-4 border-t border-white/10 pt-5">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="size-9"><AvatarFallback className="bg-slate-700 text-xs text-white">DB</AvatarFallback></Avatar>
            <div className="min-w-0"><p className="truncate text-sm font-medium text-white">Dr. Bennani</p><p className="truncate text-xs text-slate-500">Cabinet de démonstration</p></div>
          </div>
          <div className="flex items-center gap-2 px-2 text-xs text-slate-500"><ShieldCheck className="size-3.5" />Accès sécurisé</div>
        </div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
