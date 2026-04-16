/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ChevronRight, HelpCircle, LogOut, ExternalLink } from "lucide-react";

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

// Agrupa itens visíveis nas categorias definidas
function groupItems(
  items: SidebarItem[],
  groups: Record<string, string[]>
): Record<string, SidebarItem[]> {
  const result: Record<string, SidebarItem[]> = {};
  for (const [groupName, titles] of Object.entries(groups)) {
    const groupItems = items.filter((item) => titles.includes(item.title));
    if (groupItems.length > 0) {
      result[groupName] = groupItems;
    }
  }
  return result;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { state } = useSidebar();
  const { can, loading: permsLoading } = usePermissions();

  const userRole = user?.role || "user";
  const professional = isProfessionalRole(userRole);

  const groupedNavigation = React.useMemo(() => {
    if (professional) {
      // Profissionais: filtrar itens por permissão RBAC
      const visibleItems = permsLoading
        ? PROFESSIONAL_ITEMS // Durante loading, mostrar todos (evitar flash)
        : PROFESSIONAL_ITEMS.filter((item) => {
            if (!item.requiredPermission) return true;
            return can(item.requiredPermission.resource, item.requiredPermission.action);
          });
      return groupItems(visibleItems, PROFESSIONAL_GROUPS);
    } else {
      // Não-profissionais: itens baseados no role (sem RBAC)
      const items = getNonProfessionalItems(userRole);
      const groups = NON_PROFESSIONAL_GROUPS[userRole.toLowerCase()] || { "Principal": items.map(i => i.title) };
      return groupItems(items, groups);
    }
  }, [professional, userRole, permsLoading, can]);

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
