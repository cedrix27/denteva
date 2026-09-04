import { Building2, CircleAlert, RadioTower, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";

const metrics = [
  { icon: Building2, label: "Cabinets", value: "0", detail: "Aucun cabinet activé" },
  { icon: UserPlus, label: "Onboardings", value: "0", detail: "À démarrer" },
  { icon: RadioTower, label: "Canaux WhatsApp", value: "0", detail: "Non connectés" },
  { icon: CircleAlert, label: "Alertes plateforme", value: "0", detail: "Tout est normal" },
];

export function AdminDashboard() {
  return <div className="space-y-6 p-6 lg:p-8"><section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</section><Card className="shadow-none"><CardHeader><CardTitle>Pilotage de la plateforme</CardTitle><CardDescription>Cette vue interne donnera accès à l&apos;activité de tous les cabinets, sans mélanger leurs données.</CardDescription></CardHeader><CardContent><p className="text-sm text-slate-500">La liste des cabinets, leur statut d&apos;onboarding et les incidents seront ajoutés dans les prochaines étapes.</p></CardContent></Card></div>;
}
