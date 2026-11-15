import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/hooks/useAuth";
import { TemaProvider } from "@/components/tema-provider";
import { ProvedorMovimento } from "@/components/kit";
import { FilialProvider } from "@/contexts/filial-context";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caleidoscópio Educacional",
  description:
    "Plataforma educacional para atendimento terapêutico e familiar a pessoas com TEA",
  // Ícones do navegador, gerados por `node tools/gerar-icones.mjs` a partir de
  // `public/caleido_logox*.png` (só o símbolo, sem a palavra).
  //
  // Tudo declarado aqui, e não pela convenção de arquivo em `src/app`: a
  // versão de **aba escura** precisa de `media`, que a convenção não expressa,
  // e declarar `icons` no metadata substitui as tags que ela geraria — misturar
  // os dois fez o apple-touch-icon sumir. `favicon.ico` continua em `src/app`
  // porque o navegador pede `/favicon.ico` antes de ler qualquer <link>.
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
      {
        url: "/icon-dark.png",
        type: "image/png",
        sizes: "256x256",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

// Mesmas cores de tema do v2 (manifest), para a barra do navegador acompanhar.
// Vai em `viewport`, não em `metadata`: o Next 15 ignora themeColor lá.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8edf9" },
    { media: "(prefers-color-scheme: dark)", color: "#070e24" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      {/* Sem webfont: a pilha de fontes do sistema vem de --font-sans no
          globals.css, igual ao v2 (SF Pro no Apple, Inter nos demais). */}
      <body className="antialiased">
        <TemaProvider>
          {/* `reducedMotion="user"` vale para toda animação de mola e de layout
              do motion — o CSS já tinha a media query, o JavaScript não. */}
          <ProvedorMovimento>
            <AuthProvider>
              <FilialProvider>
                {children}
                <Toaster />
              </FilialProvider>
            </AuthProvider>
          </ProvedorMovimento>
        </TemaProvider>
      </body>
    </html>
  );
}
