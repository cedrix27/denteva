import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type MetricCardProps = { icon: LucideIcon; label: string; value: string; detail: string };

export function MetricCard({ icon: Icon, label, value, detail }: MetricCardProps) {
  return <Card className="shadow-none"><CardContent className="p-5"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className="rounded-lg bg-teal-50 p-2 text-teal-700"><Icon className="size-4" /></span></div><p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></CardContent></Card>;
}
