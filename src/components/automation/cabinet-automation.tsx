"use client";

import { useEffect, useState } from "react";
import { BellRing, Bot, CalendarCheck2, CheckCircle2, ChevronRight, Clock3, MessageSquareText, MoreHorizontal, Play, Plus, Send, Sparkles } from "lucide-react";

type Automation = {
  id: string;
  icon: typeof Bot;
  title: string;
  description: string;
  trigger: string;
  activity: string;
  color: "violet" | "green" | "orange" | "blue";
  active: boolean;
};

const automationCatalog: Record<string, Omit<Automation, "id" | "active">> = {
  welcome: { icon: Bot, title: "Accueil intelligent", description: "Répond instantanément aux nouveaux messages WhatsApp.", trigger: "Nouveau message", activity: "Messages traités", color: "violet" },
  reminder: { icon: BellRing, title: "Rappels de rendez-vous", description: "Envoie un rappel 24 h avant chaque consultation.", trigger: "24 h avant le rendez-vous", activity: "Rappels programmés", color: "orange" },
  booking: { icon: CalendarCheck2, title: "Confirmation automatique", description: "Confirme le créneau dès qu’un patient répond Oui.", trigger: "Réponse patient positive", activity: "Confirmations traitées", color: "green" },
  followup: { icon: MessageSquareText, title: "Suivi après consultation", description: "Prend des nouvelles après une visite au cabinet.", trigger: "48 h après le rendez-vous", activity: "Prêt à activer", color: "blue" },
};

const toneStyles = {
  violet: "bg-[#f2f1ff] text-[#6963d9]",
  green: "bg-[#ecfdf5] text-[#287a57]",
  orange: "bg-[#fff4e8] text-[#c9772b]",
  blue: "bg-[#edf6ff] text-[#3172ab]",
};

export function CabinetAutomation() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => { const load = async () => { try { const response = await fetch("/api/cabinet/automations"); if (!response.ok) throw new Error(); const data = await response.json() as { automations: { id: string; key: string; enabled: boolean }[] }; setAutomations(data.automations.flatMap((item) => automationCatalog[item.key] ? [{ id: item.id, ...automationCatalog[item.key], active: item.enabled }] : [])); } catch { setLastUpdated("Les automatisations ne peuvent pas être chargées pour le moment."); } }; void load(); }, []);

  const toggleAutomation = async (id: string) => {
    const item = automations.find((automation) => automation.id === id);
    if (!item) return;
    const nextStatus = !item.active;
    setAutomations((items) => items.map((automation) => automation.id === id ? { ...automation, active: nextStatus } : automation));
    const response = await fetch(`/api/cabinet/automations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: nextStatus }) });
    if (!response.ok) { setAutomations((items) => items.map((automation) => automation.id === id ? { ...automation, active: !nextStatus } : automation)); setLastUpdated("La modification n’a pas pu être enregistrée."); return; }
    setLastUpdated(`${item.title} ${nextStatus ? "activée" : "mise en pause"}.`);
  };
  const activateTemplate = async (key: string) => { const response = await fetch("/api/cabinet/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) }); if (!response.ok) { setLastUpdated("Cette automatisation n’a pas pu être activée."); return; } const data = await response.json() as { automation: { id: string; key: string; enabled: boolean } }; const item = automationCatalog[data.automation.key]; if (item) setAutomations((items) => items.map((automation) => automation.id === data.automation.id ? { ...automation, active: true } : automation)); setShowComposer(false); setLastUpdated(`${item?.title ?? "Automatisation"} activée.`); };

  return <div className="min-h-[calc(100vh-80px)] bg-[#fafaf8]">
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#e9e8e5] bg-white px-6 lg:px-13">
      <div className="flex items-center gap-3 text-[14px]"><span className="text-[#898681]">Cabinet</span><span className="text-[#898681]">›</span><span className="font-semibold">Automation</span></div>
      <button className="flex h-11 items-center gap-2 rounded-xl bg-[#171716] px-4 text-[13px] font-medium text-white transition-transform hover:-translate-y-0.5" onClick={() => setShowComposer((open) => !open)}><Plus className="size-4" />Nouvelle automatisation</button>
    </header>
    <main className="mx-auto max-w-[1440px] px-6 py-10 lg:px-13">
      <section className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#7c78ca]">Assistant IA</p><h1 className="mt-2 text-[30px] font-semibold tracking-[-0.055em]">Vos automatisations</h1><p className="mt-2 text-[14px] text-[#85817c]">Votre réception reste disponible, même entre deux consultations.</p></div><div className="flex items-center gap-2 rounded-xl border border-[#d9d6ff] bg-[#f5f4ff] px-3.5 py-2.5 text-[12px] font-medium text-[#6963d9]"><Sparkles className="size-4" />Assistant IA opérationnel</div></section>

      {showComposer ? <section className="mt-8 rounded-[20px] border border-[#d9d6ff] bg-white p-6 shadow-[0_12px_30px_rgba(73,66,177,0.07)]"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[16px] font-semibold">Activer une automatisation</p><p className="mt-1 text-[13px] text-[#85817c]">Choisissez un scénario prêt à configurer pour votre cabinet.</p></div><button className="text-[13px] font-medium text-[#6963d9]" onClick={() => setShowComposer(false)}>Fermer</button></div><div className="mt-5 grid gap-3 md:grid-cols-3"><TemplateCard icon={Send} title="Accueil intelligent" text="Répondre aux nouveaux messages." onClick={() => void activateTemplate("welcome")} /><TemplateCard icon={Clock3} title="Rappels de rendez-vous" text="Prévenir le patient avant sa visite." onClick={() => void activateTemplate("reminder")} /><TemplateCard icon={CalendarCheck2} title="Confirmation automatique" text="Valider les créneaux acceptés." onClick={() => void activateTemplate("booking")} /></div></section> : null}

      <section className="mt-9 grid gap-4 md:grid-cols-3"><Summary icon={Play} label="Automatisations actives" value={`${automations.filter((item) => item.active).length.toString().padStart(2, "0")}`} detail="sur 4 configurées" tone="violet" /><Summary icon={MessageSquareText} label="Conversations traitées" value="128" detail="+18 % ce mois" tone="blue" /><Summary icon={CheckCircle2} label="Rendez-vous confirmés" value="31" detail="via WhatsApp" tone="green" /></section>

      <section className="mt-10 grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px]"><div><div className="mb-5 flex items-center justify-between"><div><h2 className="text-[18px] font-semibold tracking-[-0.03em]">Scénarios du cabinet</h2><p className="mt-1 text-[13px] text-[#85817c]">Activez seulement ce qui sert votre équipe.</p></div><button className="text-[13px] font-medium text-[#6963d9]">Voir l’historique</button></div><div className="space-y-3">{automations.map((automation) => <AutomationCard automation={automation} key={automation.id} onToggle={toggleAutomation} />)}</div></div><aside className="space-y-6"><section className="rounded-[20px] border border-[#e9e8e5] bg-white p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#f2f1ff] text-[#6963d9]"><Bot className="size-5" /></span><div><h2 className="text-[15px] font-semibold">Réception IA</h2><p className="mt-0.5 text-[12px] text-[#85817c]">WhatsApp Business</p></div><span className="ml-auto size-2 rounded-full bg-[#52b788]" /></div><div className="mt-6 rounded-2xl bg-[#fafaf8] p-4"><div className="flex items-center justify-between text-[12px]"><span className="text-[#85817c]">Temps de réponse moyen</span><span className="font-semibold">12 sec.</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e9e8e5]"><div className="h-full w-[88%] rounded-full bg-[#6963d9]" /></div><p className="mt-2 text-[11px] text-[#85817c]">Excellent — objectif sous 1 min.</p></div></section><section className="rounded-[20px] border border-l-[5px] border-[#e9e8e5] border-l-[#dd8b2a] bg-white p-6"><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#c9772b]">À optimiser</p><h2 className="mt-2 text-[16px] font-semibold">7 patients attendent une réponse</h2><p className="mt-2 text-[13px] leading-relaxed text-[#85817c]">L’IA a préparé des réponses. Vous pouvez les valider depuis l’Inbox.</p><a className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#171716]" href="/cabinet/inbox">Ouvrir l’Inbox <ChevronRight className="size-4" /></a></section><section className="px-2"><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#85817c]">Aujourd’hui</p><div className="mt-4 space-y-3 text-[13px] text-[#77736f]"><Activity label="18 réponses envoyées" /><Activity label="6 rappels programmés" /><Activity label="3 créneaux confirmés" /></div></section></aside></section>
      {lastUpdated ? <p aria-live="polite" className="mt-6 text-[12px] font-medium text-[#6963d9]">{lastUpdated}</p> : null}
    </main>
  </div>;
}

function Summary({ icon: Icon, label, value, detail, tone }: { icon: typeof Play; label: string; value: string; detail: string; tone: keyof typeof toneStyles }) {
  return <article className="rounded-[20px] border border-[#e9e8e5] bg-white p-5"><span className={`grid size-9 place-items-center rounded-xl ${toneStyles[tone]}`}><Icon className="size-[17px]" /></span><p className="mt-5 text-[12px] font-medium text-[#85817c]">{label}</p><div className="mt-1 flex items-end gap-2"><strong className="text-[28px] font-semibold tracking-[-0.06em]">{value}</strong><span className="mb-1 text-[12px] text-[#85817c]">{detail}</span></div></article>;
}

function AutomationCard({ automation, onToggle }: { automation: Automation; onToggle: (id: string) => void }) {
  const Icon = automation.icon;
  return <article className={`rounded-[20px] border bg-white p-5 transition-colors ${automation.active ? "border-[#e9e8e5]" : "border-[#eeece9] opacity-75"}`}><div className="flex items-start gap-4"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${toneStyles[automation.color]}`}><Icon className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[15px] font-semibold">{automation.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${automation.active ? "bg-[#ecfdf5] text-[#287a57]" : "bg-[#f2eeea] text-[#85817c]"}`}>{automation.active ? "Actif" : "En pause"}</span></div><p className="mt-1 text-[13px] text-[#85817c]">{automation.description}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-[#77736f]"><span className="flex items-center gap-1.5"><Clock3 className="size-3.5" />{automation.trigger}</span><span className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-[#52b788]" />{automation.activity}</span></div></div><div className="flex shrink-0 items-center gap-2"><button aria-label={`Mettre ${automation.title} ${automation.active ? "en pause" : "en marche"}`} className={`relative h-6 w-10 rounded-full transition-colors ${automation.active ? "bg-[#171716]" : "bg-[#d8d5d1]"}`} onClick={() => void onToggle(automation.id)}><span className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${automation.active ? "translate-x-5" : "translate-x-1"}`} /></button><button aria-label={`Options de ${automation.title}`} className="grid size-9 place-items-center rounded-lg text-[#85817c] hover:bg-[#fafaf8]"><MoreHorizontal className="size-5" /></button></div></div></article>;
}

function TemplateCard({ icon: Icon, title, text, onClick }: { icon: typeof Send; title: string; text: string; onClick: () => void }) {
  return <button className="rounded-xl border border-[#e9e8e5] p-4 text-left transition-colors hover:border-[#d9d6ff] hover:bg-[#faf9ff]" onClick={onClick}><Icon className="size-4 text-[#6963d9]" /><p className="mt-3 text-[13px] font-semibold">{title}</p><p className="mt-1 text-[12px] leading-relaxed text-[#85817c]">{text}</p></button>;
}

function Activity({ label }: { label: string }) {
  return <p className="flex items-center gap-3"><span className="size-1.5 rounded-full bg-[#6963d9]" />{label}</p>;
}
