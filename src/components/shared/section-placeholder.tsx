import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SectionPlaceholderProps = { title: string; description: string };

export function SectionPlaceholder({ title, description }: SectionPlaceholderProps) {
  return <Card className="border-dashed shadow-none"><CardHeader><Construction className="size-5 text-teal-700" /><CardTitle className="pt-3">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><p className="text-sm text-slate-500">Cette section sera construite étape par étape.</p></CardContent></Card>;
}
