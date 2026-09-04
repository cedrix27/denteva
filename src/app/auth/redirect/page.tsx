import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { PlatformRole } from "@prisma/client";
import { getCurrentMembership, getCurrentUserRecord } from "@/lib/current-cabinet";
import { prisma } from "@/lib/prisma";
import { isPlatformAdminEmail } from "@/lib/platform-admin";

export default async function AuthRedirectPage() {
  const { userId } = await auth();
  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isPlatformAdmin = Boolean(userId && isPlatformAdminEmail(email));
  if (isPlatformAdmin) {
    await prisma.user.upsert({
      where: { externalId: userId! },
      update: { email: email!, name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null, platformRole: PlatformRole.PLATFORM_ADMIN },
      create: { externalId: userId!, email: email!, name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null, platformRole: PlatformRole.PLATFORM_ADMIN },
    });
    redirect("/admin");
  }

  const user = await getCurrentUserRecord();
  if (user?.platformRole === "PLATFORM_ADMIN") redirect("/admin");

  let membership = await getCurrentMembership();
  if (!membership && userId && email) {
    const invitation = await prisma.cabinetInvitation.findFirst({ where: { email, acceptedAt: null }, orderBy: { createdAt: "desc" } });
    if (invitation) {
      const localUser = await prisma.user.upsert({ where: { externalId: userId }, update: { email, name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null }, create: { externalId: userId, email, name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null, platformRole: PlatformRole.CABINET_MEMBER } });
      await prisma.$transaction([prisma.cabinetMembership.upsert({ where: { cabinetId_userId: { cabinetId: invitation.cabinetId, userId: localUser.id } }, update: { role: invitation.role }, create: { cabinetId: invitation.cabinetId, userId: localUser.id, role: invitation.role } }), prisma.cabinetInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } })]);
      membership = await getCurrentMembership();
    }
  }
  if (membership) redirect("/cabinet");
  redirect("/onboarding");
}
