import { Button } from "@/components/ui/button";

type PageHeaderProps = { title: string; description: string; action?: string };

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div><h1 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>
      {action ? <Button disabled>{action}</Button> : null}
    </header>
  );
}
