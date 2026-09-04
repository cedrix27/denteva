import { prisma } from "@/lib/prisma";

/**
 * Temporary tenant resolver used only until authentication is implemented.
 * Production API routes must resolve the cabinet from the signed-in user.
 */
export async function getDemoCabinet() {
  if (process.env.NODE_ENV === "production") throw new Error("Authentication is required to resolve a cabinet.");

  return prisma.cabinet.upsert({
    where: { slug: "cabinet-dr-bennani" },
    update: {},
    create: { name: "Cabinet Dr. Bennani", slug: "cabinet-dr-bennani" },
  });
}
