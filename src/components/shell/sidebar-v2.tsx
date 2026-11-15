"use client";

// Sidebar flutuante em vidro do design v2 (Módulo 28).
//
// Só muda a aparência: o agrupamento dos itens, o filtro por RBAC e o papel do
// usuário vêm de `@/lib/navigation` e `usePermissions` exatamente como antes.
//
// Anatomia conferida contra a captura do v2 (`capturas/dashboard_01_desktop.png`)
// e os estilos computados da auditoria:
//   casca    264px, glass, rounded-[1.75rem], border-rim, shadow-card, top-4
//   marca    px-5 pt-6 pb-5 · chip 44px com gradiente da marca
//   filial   px-4 pb-4 · gatilho de 48px, rounded-2xl
//   lista    px-3 pb-4 · grupo `mt-3 first:mt-0`
//   seção    overline 0.66rem/600, caixa alta, tracking 0.08em, `ink-4`
//   item     44px, rounded-2xl (24px), px-3, gap-3, ícone 18px, 0.9rem/500
//   ativo    texto branco sobre bg-brand + sombra longa + ponto branco de 6px
//   rodapé   border-t hairline, px-4 pt-4 pb-5
//
// Recolhida (botão da topbar): 88px, só os ícones centrados, sem o seletor de
// filial e sem os rótulos de seção. É o mesmo comportamento do v2 — lá a
// largura também vai em style inline, de 264 para 88.
//
// O fundo do item ativo é um `MarcadorDeslizante`: um elemento só, que escorrega
// do item antigo para o novo (mola 380/32). Pintar `bg-brand` em cada item faria
// o destaque piscar de lugar, que é o que acontecia antes do `motion`.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, LogOut } from "lucide-react";
import { motion } from "motion/react";

import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  PROFESSIONAL_ITEMS,
  PROFESSIONAL_GROUPS,
  getNonProfessionalItems,
  NON_PROFESSIONAL_GROUPS,
  isProfessionalRole,
  SidebarItem,
} from "@/lib/navigation";
import { NavUser } from "@/components/nav-user";
import { FilialSelector } from "@/components/filial-selector";
import { IconeAnimado, MarcadorDeslizante } from "@/components/kit";
import { cn } from "@/lib/utils";

function agrupar(
  items: SidebarItem[],
  grupos: Record<string, string[]>
): Record<string, SidebarItem[]> {
  const saida: Record<string, SidebarItem[]> = {};
  for (const [nome, titulos] of Object.entries(grupos)) {
    const doGrupo = items.filter((item) => titulos.includes(item.title));
    if (doGrupo.length > 0) saida[nome] = doGrupo;
  }
  return saida;
}

export function SidebarV2({
  className,
  recolhida = false,
}: {
  className?: string;
  recolhida?: boolean;
}) {
  const { user, logout, roleEfetivo, rbacCarregado } = useAuth();
  const pathname = usePathname();
  const { can, loading: permsLoading } = usePermissions();

  // A gaveta do mobile monta uma segunda `SidebarV2` enquanto a fixa ainda
  // existe. Com `layoutId` repetido o motion tentaria interpolar entre as duas.
  const idMarcador = `sidebar-marcador-${React.useId()}`;

  // Perfil RBAC manda no menu. Antes do RBAC chegar, cai no role do SSO só para
  // não piscar um menu vazio — o conteúdo real é filtrado por `can()` abaixo.
  const userRole = (rbacCarregado ? roleEfetivo : user?.role) || "user";
  const profissional = isProfessionalRole(userRole);

  const navegacao = React.useMemo(() => {
    if (profissional) {
      const visiveis = permsLoading
        ? PROFESSIONAL_ITEMS // durante o carregamento, mostrar todos evita flash
        : PROFESSIONAL_ITEMS.filter((item) => {
            if (!item.requiredPermission) return true;
            return can(item.requiredPermission.resource, item.requiredPermission.action);
          });
      return agrupar(visiveis, PROFESSIONAL_GROUPS);
    }
    const items = getNonProfessionalItems(userRole);
    const grupos =
      NON_PROFESSIONAL_GROUPS[userRole.toLowerCase()] || {
        Principal: items.map((i) => i.title),
      };
    return agrupar(items, grupos);
  }, [profissional, userRole, permsLoading, can]);

  const ativo = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <aside
      style={{ width: recolhida ? 88 : 264 }}
      className={cn(
        "glass sticky top-4 hidden h-[calc(100dvh-2rem)] shrink-0 flex-col",
        "overflow-hidden rounded-[1.75rem] border border-rim shadow-card lg:flex",
        "transition-[width] duration-300 ease-out",
        className
      )}
    >
      {/* Marca da clínica */}
      <div className={cn("shrink-0 pt-6 pb-1", recolhida ? "px-3" : "px-5")}>
        <Link
          href="/dashboard"
          title={recolhida ? user?.tenant?.name || "Caleidoscópio" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-2xl p-1 transition-colors hover:bg-surface/60",
            recolhida && "justify-center"
          )}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[0.9rem] bg-[linear-gradient(145deg,#4c6cff,#2f55f0)] shadow-[0_8px_18px_-8px_rgba(47,85,240,0.9)]">
            <span className="size-4 rounded-full bg-white/90" />
          </span>
          {!recolhida && (
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink">
                {user?.tenant?.name || "Caleidoscópio"}
              </span>
              <span className="block truncate text-xs text-ink-3">Sistema Educacional</span>
            </span>
          )}
        </Link>
      </div>

      {/* Recolhida, o seletor de filial sai: um gatilho de 48px sem rótulo não
          diz qual unidade está ativa, que é a única coisa que ele faz. */}
      {!recolhida && (
        <div className="shrink-0 px-4 pt-4 pb-4">
          <FilialSelector />
        </div>
      )}
      {recolhida && <div className="mx-3 mt-4 border-t border-hairline" />}

      {/* Navegação */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {Object.entries(navegacao).map(([grupo, items]) => (
          <div key={grupo} className="mt-3 first:mt-0">
            {!recolhida && (
              <p className="px-3 pt-2 pb-1.5 text-[0.66rem] font-semibold tracking-[0.08em] text-ink-4 uppercase">
                {grupo}
              </p>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const Icone = item.icon;
                const estaAtivo = ativo(item.href);
                return (
                  <motion.li key={item.href} initial="repouso" whileHover="pairado">
                    <Link
                      href={item.href}
                      aria-current={estaAtivo ? "page" : undefined}
                      title={recolhida ? item.title : undefined}
                      className={cn(
                        "relative flex h-11 items-center gap-3 rounded-2xl px-3 text-[0.9rem] font-medium",
                        "transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                        recolhida && "justify-center px-0",
                        estaAtivo ? "text-white" : "text-ink-2 hover:bg-surface hover:text-ink"
                      )}
                    >
                      {estaAtivo && (
                        <MarcadorDeslizante
                          id={idMarcador}
                          className="absolute inset-0 rounded-2xl bg-brand shadow-[0_10px_22px_-10px_rgba(47,85,240,0.9)]"
                        />
                      )}
                      {/* `relative` nos irmãos: o marcador é o primeiro filho e
                          fica atrás sem precisar de z-index negativo. */}
                      <IconeAnimado className="relative shrink-0">
                        <Icone className="size-[18px]" aria-hidden />
                      </IconeAnimado>
                      {!recolhida && (
                        <span className="relative min-w-0 flex-1 truncate">{item.title}</span>
                      )}
                      {estaAtivo && !recolhida && (
                        <span
                          className="relative size-1.5 shrink-0 rounded-full bg-surface"
                          aria-hidden
                        />
                      )}
                      {!estaAtivo && !recolhida && item.badge && (
                        <span className="relative shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[0.72rem] font-medium text-brand">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Usuário e ações */}
      <div
        className={cn(
          "shrink-0 border-t border-hairline pt-4 pb-5",
          recolhida ? "px-2" : "px-4"
        )}
      >
        {user && <NavUser user={user} compacta={recolhida} />}
        <div
          className={cn(
            "mt-3 flex items-center text-[0.8rem] text-ink-3",
            recolhida ? "flex-col gap-3" : "justify-between px-2"
          )}
        >
          <Link
            href="/suporte"
            title="Suporte"
            className="flex items-center gap-1.5 transition hover:text-ink"
          >
            <HelpCircle className="size-4" aria-hidden />
            {!recolhida && "Suporte"}
          </Link>
          <button
            type="button"
            onClick={logout}
            title="Sair"
            className="flex items-center gap-1.5 transition hover:text-danger"
          >
            <LogOut className="size-4" aria-hidden />
            {!recolhida && "Sair"}
          </button>
        </div>
      </div>
    </aside>
  );
}
