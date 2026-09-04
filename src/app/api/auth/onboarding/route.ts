import { auth, currentUser } from "@clerk/nextjs/server";
import { MembershipRole, PlatformRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "cabinet";
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const cabinetName = typeof body?.cabinetName === "string" ? body.cabinetName.trim() : "";
  const practitionerName = typeof body?.practitionerName === "string" ? body.practitionerName.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const city = typeof body?.city === "string" ? body.city.trim() : "";
  const building = typeof body?.building === "string" ? body.building.trim() : "";
  const floor = typeof body?.floor === "string" ? body.floor.trim() : "";
  const mapsUrl = typeof body?.mapsUrl === "string" ? body.mapsUrl.trim() : "";
  const accessInstructions = typeof body?.accessInstructions === "string" ? body.accessInstructions.trim() : "";
  const weekdays = typeof body?.weekdays === "string" ? body.weekdays.trim() : "";
  const saturday = typeof body?.saturday === "string" ? body.saturday.trim() : "";
  const sunday = typeof body?.sunday === "string" ? body.sunday.trim() : "";
  const supportedLanguages = Array.isArray(body?.supportedLanguages) ? body.supportedLanguages.filter((language): language is string => typeof language === "string" && ["fr", "en", "darija"].includes(language)).slice(0, 3) : [];
  if (cabinetName.length < 2 || cabinetName.length > 100) {
    return Response.json({ error: "Indiquez le nom de votre cabinet." }, { status: 422 });
  }
  if (!city || !phone || !address) return Response.json({ error: "Ajoutez le téléphone, l’adresse et la ville du cabinet." }, { status: 422 });
  if (mapsUrl && !/^https?:\/\//i.test(mapsUrl)) return Response.json({ error: "Le lien Google Maps doit commencer par https://." }, { status: 422 });

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) return Response.json({ error: "Une adresse e-mail vérifiée est requise." }, { status: 422 });
  const isPlatformAdmin = isPlatformAdminEmail(email);

  const existingMembership = await prisma.cabinetMembership.findFirst({
    where: { user: { externalId: userId } },
    include: { cabinet: true },
  });
  if (existingMembership) return Response.json({ cabinet: existingMembership.cabinet });

  const baseSlug = toSlug(cabinetName);
  const suffix = Math.random().toString(36).slice(2, 7);
  const cabinet = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { externalId: userId },
      update: { email, name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null, platformRole: isPlatformAdmin ? PlatformRole.PLATFORM_ADMIN : undefined },
      create: { externalId: userId, email, name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null, platformRole: isPlatformAdmin ? PlatformRole.PLATFORM_ADMIN : PlatformRole.CABINET_MEMBER },
    });
    const createdCabinet = await tx.cabinet.create({
      data: { name: cabinetName, slug: `${baseSlug}-${suffix}`, practitionerName: practitionerName || null, phone, address, city, building: building || null, floor: floor || null, mapsUrl: mapsUrl || null, accessInstructions: accessInstructions || null, openingHours: { weekdays, saturday, sunday }, supportedLanguages: supportedLanguages.length ? supportedLanguages : ["fr"] },
    });
    await tx.cabinetMembership.create({
      data: { cabinetId: createdCabinet.id, userId: user.id, role: MembershipRole.OWNER },
    });
    return createdCabinet;
  });

  return Response.json({ cabinet }, { status: 201 });
}
