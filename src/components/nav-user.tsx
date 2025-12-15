/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { ChevronsUpDown, LogOut, ExternalLink, HelpCircle } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: {
      id: string;
      name: string;
    };
  };
}

export function NavUser({ user }: { user: User }) {
  const { logout } = useAuth();
  const { isMobile } = useSidebar();

  const handleLogout = () => {
    logout();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {user.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">
                  {user.tenant?.name || user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    {user.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                  {user.tenant && (
                    <span className="truncate text-xs text-muted-foreground">
                      {user.tenant.name}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Acesso ao Sistema Manager */}
            {user.tenant && (
              <DropdownMenuItem asChild>
                <Link
                  href="http://localhost:3000/dashboard"
                  target="_blank"
                  className="cursor-pointer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Sistema Manager
                </Link>
              </DropdownMenuItem>
            )}

            {/* Suporte */}
            <DropdownMenuItem asChild>
              <Link href="/suporte" className="cursor-pointer">
                <HelpCircle className="mr-2 h-4 w-4" />
                Suporte
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Logout */}
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
