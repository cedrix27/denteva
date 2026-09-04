export function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const configured = process.env.PLATFORM_ADMIN_EMAILS || process.env.PLATFORM_ADMIN_EMAIL || "";
  return configured.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean).includes(email.trim().toLowerCase());
}
