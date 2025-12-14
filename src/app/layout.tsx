import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "sonner";
import "./globals.css";

const mulish = Mulish({
  subsets: ["latin-ext"],
});

export const metadata: Metadata = {
  title: "Caleidoscópio Educacional",
  description:
    "Plataforma educacional para atendimento terapêutico e familiar a pessoas com TEA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${mulish.className} ${mulish.className} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
