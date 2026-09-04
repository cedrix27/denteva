import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { CabinetShell } from "@/components/cabinet/cabinet-shell";
import { getCurrentMembership } from "@/lib/current-cabinet";

export default async function CabinetLayout({ children }: { children: ReactNode }) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");
  return <CabinetShell>{children}</CabinetShell>;
}
