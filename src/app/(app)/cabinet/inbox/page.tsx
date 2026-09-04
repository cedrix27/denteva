import { CabinetInbox } from "@/components/inbox/cabinet-inbox";
import { Suspense } from "react";

export default function InboxPage() {
  return <Suspense fallback={<div className="grid min-h-[calc(100vh-80px)] place-items-center text-[13px] text-[#85817c]">Chargement de l’Inbox…</div>}><CabinetInbox /></Suspense>;
}
