import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentCabinet() {
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");

  const membership = await prisma.cabinetMembership.findFirst({
    where: { user: { externalId: userId } },
    include: { cabinet: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) throw new Error("CABINET_NOT_CONFIGURED");
  return membership.cabinet;
}

export async function getCurrentMembership() {
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHENTICATED");

  return prisma.cabinetMembership.findFirst({
    where: { user: { externalId: userId } },
    include: { cabinet: true, user: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCurrentUserRecord() {
  const { userId } = await auth();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { externalId: userId } });
}
