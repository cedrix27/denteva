import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUserRecord } from "@/lib/current-cabinet";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUserRecord();
  if (user?.platformRole !== "PLATFORM_ADMIN") redirect("/cabinet");
  return <AdminShell>{children}</AdminShell>;
}
