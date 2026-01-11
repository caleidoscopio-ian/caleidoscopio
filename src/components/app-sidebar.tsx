/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ChevronRight, HelpCircle, LogOut, ExternalLink } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { getSidebarItems } from "@/lib/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Vamos manter a mesma estrutura de dados que temos atualmente
interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roleFilter?: string[];
}

// Reorganizar itens por grupos para hierarquia
const getGroupedNavigation = (userRole: string) => {
  const allItems = getSidebarItems(userRole);

  // Agrupar por categorias baseado no role
  switch (userRole.toLowerCase()) {
    case "paciente":
    case "aluno":
      return {
        Aprendizado: allItems.filter((item) =>
          [
            "Trilhas Ativas",
            "Atividades",
            "Conquistas",
            "Meu Progresso",
          ].includes(item.title)
        ),
        Perfil: allItems.filter((item) => item.title === "Meu Perfil"),
      };

    case "responsavel":
    case "tutor":
      return {
        Acompanhamento: allItems.filter((item) =>
          [
            "Acompanhar Aluno",
            "Progresso do Aluno",
            "Trilhas do Aluno",
          ].includes(item.title)
        ),
        Comunicação: allItems.filter((item) =>
          ["Relatórios Semanais", "Comunicação"].includes(item.title)
        ),
        Perfil: allItems.filter((item) => item.title === "Meu Perfil"),
      };

    case "user": // Role USER = Terapeuta
    case "terapeuta":
      return {
        Principal: allItems.filter((item) => item.title === "Dashboard"),
        "Gestão Clínica": allItems.filter((item) =>
          ["Meus Pacientes", "Agenda", "Prontuários", "Anamneses"].includes(item.title)
        ),
        "Atendimento": allItems.filter((item) =>
          ["Iniciar Sessão", "Curriculum", "Atividades", "Avaliações", "Histórico de Sessões"].includes(item.title)
        ),
        Perfil: allItems.filter((item) => item.title === "Meu Perfil"),
      };

    case "admin":
    case "super_admin":
      return {
        Principal: allItems.filter((item) => item.title === "Dashboard"),
        "Gestão de Usuários": allItems.filter((item) =>
          [
            "Usuários",
            "Terapeutas",
            "Responsáveis",
            "Pacientes",
          ].includes(item.title)
        ),
        "Sistema Clínico": allItems.filter((item) =>
          ["Agenda Global", "Prontuários", "Anamneses"].includes(item.title)
        ),
        "Atendimento": allItems.filter((item) =>
          ["Iniciar Sessão", "Curriculum", "Atividades", "Avaliações", "Histórico de Sessões"].includes(item.title)
        ),
        Administração: allItems.filter((item) =>
          ["Relatórios e Indicadores", "Permissões", "Configurações"].includes(
            item.title
          )
        ),
        Perfil: allItems.filter((item) => item.title === "Meu Perfil"),
      };

    default:
      return {
        Principal: allItems,
      };
  }
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { state } = useSidebar();

  const groupedNavigation = getGroupedNavigation(user?.role || "user");

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                  <div className="h-4 w-4 rounded-full bg-primary-foreground/80" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user?.tenant?.name || "Caleidoscópio"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.tenant?.cnpj
                      ? `CNPJ: ${user.tenant.cnpj}`
                      : "Sistema Educacional"}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {Object.entries(groupedNavigation).map(([groupName, items]) => (
          <SidebarGroup key={groupName}>
            <SidebarGroupLabel>{groupName}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item: SidebarItem) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={state === "collapsed" ? item.title : undefined}
                      >
                        <Link href={item.href}>
                          <Icon className="h-4 w-4 text-primary" />
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto text-xs bg-sidebar-accent text-sidebar-accent-foreground px-1.5 py-0.5 rounded-md">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {user && <NavUser user={user} />}

        {/* Botões de Ação */}
        <div className="p-2 space-y-1">
          {/* Suporte */}
          <Link href="/suporte">
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start",
                state === "collapsed" && "justify-center px-2"
              )}
              size={state === "collapsed" ? "icon" : "default"}
            >
              <HelpCircle className="h-4 w-4" />
              {state !== "collapsed" && (
                <span className="ml-2 text-sm">Suporte</span>
              )}
            </Button>
          </Link>

          {/* Logout */}
          <Button
            variant="outline"
            onClick={logout}
            className={cn(
              "w-full justify-start hover:text-foreground",
              state === "collapsed" && "justify-center px-2"
            )}
            size={state === "collapsed" ? "icon" : "default"}
          >
            <LogOut className="h-4 w-4" />
            {state !== "collapsed" && (
              <span className="ml-2 text-sm">Sair</span>
            )}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
