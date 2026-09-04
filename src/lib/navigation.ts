import type { LucideIcon } from "lucide-react";
import { Activity, Building2, CalendarDays, ClipboardList, Inbox, LayoutDashboard, Settings, Users } from "lucide-react";

export type NavigationItem = { href: string; icon: LucideIcon; label: string };

export const cabinetNavigation: NavigationItem[] = [
  { href: "/cabinet", icon: LayoutDashboard, label: "Vue d'ensemble" },
  { href: "/cabinet/inbox", icon: Inbox, label: "Conversations" },
  { href: "/cabinet/appointments", icon: CalendarDays, label: "Rendez-vous" },
  { href: "/cabinet/patients", icon: Users, label: "Patients" },
  { href: "/cabinet/settings", icon: Settings, label: "Paramètres" },
];

export const adminNavigation: NavigationItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Vue d'ensemble" },
  { href: "/admin/cabinets", icon: Building2, label: "Cabinets" },
  { href: "/admin/onboarding", icon: ClipboardList, label: "Onboarding" },
  { href: "/admin/activity", icon: Activity, label: "Activité" },
];
