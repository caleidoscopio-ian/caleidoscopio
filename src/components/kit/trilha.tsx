"use client";

// Trilha (migalhas de pão) do design v2 (Módulo 28).
//
// Anatomia conferida no clone navegável:
//
//   nav  aria-label="Trilha"  flex items-center gap-1 text-[0.8rem] text-ink-3
//     a      transition hover:text-brand     «Dashboard»
//     svg    chevron 13px
//     span   text-ink-2                      «Agenda»
//
// No v2 ela aparece em 9 das 31 telas, porque lá cada página decide. Aqui ela
// é **padrão em todas**: o `PageHeader` deriva da rota quando a página não diz
// nada. Trilha que some em metade do produto não orienta ninguém — e, pior,
// faz o título dançar 20px para cima e para baixo entre telas.
//
// Precedência:
//   1. `migalhas` passado ao `PageHeader`
//   2. `breadcrumbs` passado ao `MainLayout` (o que as páginas já fazem)
//   3. derivado da rota, com os rótulos de `@/lib/navigation`

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PROFESSIONAL_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export interface Migalha {
  label: string;
  href?: string;
}

const ContextoTrilha = React.createContext<Migalha[] | undefined>(undefined);

export function ProvedorTrilha({
  migalhas,
  children,
}: {
  migalhas?: Migalha[];
  children: React.ReactNode;
}) {
  return <ContextoTrilha.Provider value={migalhas}>{children}</ContextoTrilha.Provider>;
}

/** Rótulos de rota conhecidos, para os segmentos que não são item de menu. */
const ROTULOS: Record<string, string> = {
  novo: "Novo",
  nova: "Nova",
  editar: "Editar",
  detalhes: "Detalhes",
  perfil: "Meu Perfil",
  prontuario: "Prontuário",
  pacotes: "Pacotes",
  "mapa-ocupacao": "Mapa de Ocupação",
  "sem-permissao": "Acesso Negado",
  "design-system": "Design System",
};

/** Um segmento de rota vira rótulo legível. Id (cuid/uuid) não vira nada —
 *  "Paciente > cmo0h6yky0001" não ajuda ninguém, e o título da tela já diz
 *  de quem é a ficha. */
function rotuloDoSegmento(segmento: string): string | null {
  if (ROTULOS[segmento]) return ROTULOS[segmento];
  if (/^[0-9a-f-]{16,}$/i.test(segmento) || /^c[a-z0-9]{20,}$/i.test(segmento)) return null;
  return segmento
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function derivarDaRota(rota: string): Migalha[] {
  const partes = rota.split("/").filter(Boolean);
  if (partes.length === 0 || rota === "/dashboard") return [];

  const migalhas: Migalha[] = [{ label: "Dashboard", href: "/dashboard" }];
  let acumulado = "";

  for (let i = 0; i < partes.length; i++) {
    acumulado += "/" + partes[i];
    const doMenu = PROFESSIONAL_ITEMS.find((item) => item.href === acumulado);
    const rotulo = doMenu?.title ?? rotuloDoSegmento(partes[i]);
    if (!rotulo) continue;
    const ultima = i === partes.length - 1;
    migalhas.push({ label: rotulo, href: ultima ? undefined : acumulado });
  }

  return migalhas;
}

export function useTrilha(migalhas?: Migalha[]): Migalha[] {
  const doContexto = React.useContext(ContextoTrilha);
  const rota = usePathname();
  return React.useMemo(() => {
    if (migalhas?.length) return migalhas;
    if (doContexto?.length) return doContexto;
    return derivarDaRota(rota ?? "");
  }, [migalhas, doContexto, rota]);
}

export function Trilha({ migalhas, className }: { migalhas: Migalha[]; className?: string }) {
  if (migalhas.length === 0) return null;
  return (
    <nav
      aria-label="Trilha"
      className={cn("flex flex-wrap items-center gap-1 text-[0.8rem] text-ink-3", className)}
    >
      {migalhas.map((m, i) => (
        <React.Fragment key={`${m.label}-${i}`}>
          {i > 0 && <ChevronRight className="size-[13px] shrink-0" aria-hidden />}
          {m.href && i < migalhas.length - 1 ? (
            <Link href={m.href} className="transition-colors hover:text-brand">
              {m.label}
            </Link>
          ) : (
            <span className={i === migalhas.length - 1 ? "text-ink-2" : undefined}>
              {m.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
