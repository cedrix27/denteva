import { tool } from "ai";
import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";
import { findAvailableSlots, formatSlot, isWithinOpeningHours, zonedTimeToUtc } from "@/lib/availability";
import { cancelAppointmentOnGoogle, syncAppointmentToGoogle } from "@/lib/google-calendar";
import { notifyUrgentConversation } from "@/lib/cabinet-notifications";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { ConversationStatus } from "@prisma/client";

const MAX_HORIZON_DAYS = 60;
const SEARCH_WINDOW_DAYS = 14;

export type BookingContext = {
  cabinetId: string;
  cabinetName: string;
  patientId: string;
  conversationId: string;
  openingHours: unknown;
  timeZone: string;
  slotDurationMinutes: number;
};

function horizon() {
  return new Date(Date.now() + MAX_HORIZON_DAYS * 86_400_000);
}

/** Parses "YYYY-MM-DD" plus "HH:MM" as cabinet-local wall clock, never as server time. */
function parseLocalDateTime(date: string, time: string, timeZone: string) {
  const day = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const clock = time.match(/^(\d{2}):(\d{2})$/);
  if (!day || !clock) return null;
  const parsed = zonedTimeToUtc(Number(day[1]), Number(day[2]), Number(day[3]), Number(clock[1]), Number(clock[2]), timeZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Tools handed to the assistant. Every write re-validates its inputs against the
 * database and the cabinet's opening hours — the model's arguments are untrusted.
 */
export function appointmentTools(context: BookingContext) {
  const upcomingWhere = { cabinetId: context.cabinetId, patientId: context.patientId, status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] }, startsAt: { gte: new Date() } };

  return {
    transferer_a_l_equipe: tool({
      description: "Passe la conversation à l'équipe humaine du cabinet. À appeler dès que tu promets au patient de transmettre sa demande, dès que tu détectes une urgence médicale, ou dès que l'information demandée est absente de la Base IA. Appelle-le AVANT de répondre au patient : sans cet appel, personne au cabinet ne sera prévenu.",
      inputSchema: z.object({
        raison: z.string().max(300).describe("Pourquoi l'équipe doit reprendre, en une phrase."),
        urgent: z.boolean().describe("true si le patient décrit une urgence médicale (douleur intense, saignement, gonflement, traumatisme, difficulté à respirer ou avaler)."),
      }),
      execute: async ({ raison, urgent }) => {
        await prisma.conversation.update({ where: { id: context.conversationId }, data: { status: ConversationStatus.WAITING_HUMAN, ...(urgent ? { urgent: true } : {}) } });
        if (urgent) await notifyUrgentConversation(context.cabinetId, context.conversationId).catch(() => undefined);
        logger.warn("assistant.handover_requested", { cabinetId: context.cabinetId, conversationId: context.conversationId, urgent, raison });
        return { transfere: true, urgent, message: "L'équipe du cabinet est prévenue et reprend la conversation. Confirme-le au patient." };
      },
    }),

    chercher_disponibilites: tool({
      description: "Liste les créneaux libres du cabinet. À utiliser dès que le patient évoque une prise de rendez-vous, avant toute proposition d'horaire.",
      inputSchema: z.object({
        a_partir_de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().describe("Date de début de recherche au format AAAA-MM-JJ. null pour partir d'aujourd'hui."),
      }),
      execute: async ({ a_partir_de }) => {
        const now = new Date();
        const requested = a_partir_de ? parseLocalDateTime(a_partir_de, "00:00", context.timeZone) : null;
        const from = requested && requested > now ? requested : now;
        const to = new Date(Math.min(from.getTime() + SEARCH_WINDOW_DAYS * 86_400_000, horizon().getTime()));
        const slots = await findAvailableSlots({ cabinetId: context.cabinetId, openingHours: context.openingHours, timeZone: context.timeZone, durationMinutes: context.slotDurationMinutes, from, to, limit: 6 });
        if (!slots.length) return { creneaux: [], message: "Aucun créneau libre sur cette période. Propose au patient d'être rappelé par le cabinet." };
        return {
          duree_minutes: context.slotDurationMinutes,
          creneaux: slots.map((slot) => ({
            date: new Intl.DateTimeFormat("en-CA", { timeZone: context.timeZone }).format(slot.startsAt),
            heure: new Intl.DateTimeFormat("fr-FR", { timeZone: context.timeZone, hour: "2-digit", minute: "2-digit" }).format(slot.startsAt),
            libelle: slot.label,
          })),
        };
      },
    }),

    reserver_creneau: tool({
      description: "Réserve définitivement un créneau. N'appelle cet outil qu'après avoir énoncé la date et l'heure exactes au patient et obtenu son accord explicite.",
      inputSchema: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date au format AAAA-MM-JJ"),
        heure: z.string().regex(/^\d{2}:\d{2}$/).describe("Heure de début au format HH:MM"),
        motif: z.string().max(200).nullable().describe("Motif de la consultation tel que formulé par le patient, ou null."),
      }),
      execute: async ({ date, heure, motif }) => {
        const startsAt = parseLocalDateTime(date, heure, context.timeZone);
        if (!startsAt) return { reserve: false, raison: "Date ou heure invalide." };
        const endsAt = new Date(startsAt.getTime() + context.slotDurationMinutes * 60_000);
        if (startsAt.getTime() < Date.now() + 30 * 60_000) return { reserve: false, raison: "Ce créneau est déjà passé ou trop proche. Propose-lui une autre disponibilité." };
        if (startsAt > horizon()) return { reserve: false, raison: `Les réservations sont limitées à ${MAX_HORIZON_DAYS} jours.` };
        if (!isWithinOpeningHours(startsAt, context.slotDurationMinutes, context.openingHours, context.timeZone)) return { reserve: false, raison: "Le cabinet est fermé sur ce créneau. Utilise chercher_disponibilites puis propose un horaire valide." };

        const existing = await prisma.appointment.findFirst({ where: upcomingWhere, select: { id: true, startsAt: true } });
        if (existing) return { reserve: false, raison: `Ce patient a déjà un rendez-vous le ${formatSlot(existing.startsAt, context.timeZone)}. Propose de l'annuler avant d'en prendre un autre.` };

        const conflict = await prisma.appointment.findFirst({ where: { cabinetId: context.cabinetId, status: { not: AppointmentStatus.CANCELLED }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { id: true } });
        if (conflict) return { reserve: false, raison: "Ce créneau vient d'être pris. Propose-lui une autre disponibilité." };

        const appointment = await prisma.appointment.create({
          data: { cabinetId: context.cabinetId, patientId: context.patientId, startsAt, endsAt, reason: motif?.trim() || null, status: AppointmentStatus.PENDING },
          include: { patient: true },
        });
        const sync = await syncAppointmentToGoogle(appointment).catch(() => ({ synced: false as const, reason: "SYNC_FAILED" }));
        logger.info("appointment.booked_by_assistant", { cabinetId: context.cabinetId, conversationId: context.conversationId, appointmentId: appointment.id, googleSynced: sync.synced });
        return { reserve: true, quand: formatSlot(startsAt, context.timeZone), statut: "à confirmer par le cabinet" };
      },
    }),

    lister_mes_rendez_vous: tool({
      description: "Liste les rendez-vous à venir de ce patient dans ce cabinet.",
      inputSchema: z.object({}),
      execute: async () => {
        const appointments = await prisma.appointment.findMany({ where: upcomingWhere, orderBy: { startsAt: "asc" }, take: 5, select: { id: true, startsAt: true, reason: true, status: true } });
        return { rendez_vous: appointments.map((item) => ({ reference: item.id, quand: formatSlot(item.startsAt, context.timeZone), motif: item.reason, statut: item.status })) };
      },
    }),

    annuler_rendez_vous: tool({
      description: "Annule un rendez-vous à venir du patient. Demande confirmation avant d'appeler cet outil.",
      inputSchema: z.object({ reference: z.string().describe("Référence renvoyée par lister_mes_rendez_vous") }),
      execute: async ({ reference }) => {
        const cancelled = await prisma.appointment.updateMany({ where: { id: reference, ...upcomingWhere }, data: { status: AppointmentStatus.CANCELLED } });
        if (!cancelled.count) return { annule: false, raison: "Aucun rendez-vous à venir ne correspond à cette référence." };
        // The slot is free in our database; the dentist's Google agenda must follow,
        // otherwise the event lingers and the slot looks busy on their side.
        const appointment = await prisma.appointment.findUnique({ where: { id: reference }, include: { patient: true } });
        const sync = appointment ? await cancelAppointmentOnGoogle(appointment).catch(() => ({ synced: false as const })) : { synced: false as const };
        logger.info("appointment.cancelled_by_assistant", { cabinetId: context.cabinetId, conversationId: context.conversationId, appointmentId: reference, googleSynced: sync.synced });
        return { annule: true };
      },
    }),
  };
}
