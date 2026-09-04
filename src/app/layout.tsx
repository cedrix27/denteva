import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Denteva",
  description: "Réceptionniste IA WhatsApp pour cabinets dentaires.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><ClerkProvider appearance={{ theme: shadcn }} dynamic>{children}</ClerkProvider></body>
    </html>
  );
}
