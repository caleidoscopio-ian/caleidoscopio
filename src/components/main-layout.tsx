"use client";

import Image from "next/image";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

interface MainLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export function MainLayout({ children, breadcrumbs }: MainLayoutProps) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        {/* Sidebar com estilo fixo igual trader-evaluation */}
        <AppSidebar className="fixed rounded-2xl left-0 w-64 h-screen z-30 bg-white border-r border-gray-200" />

        {/* Main Content */}
        <main className="flex-1 pl-6">
          {/* Header com Logo, Trigger e Breadcrumbs */}
          <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />

            {/* Logo no Header */}
            <div className="flex items-center gap-2">
              <Image
                src="/caleido_logox.png"
                alt="Caleidoscópio Logo"
                width={100}
                height={60}
                className="object-contain"
                priority
              />
            </div>

            {/* Breadcrumbs */}
            {breadcrumbs && (
              <Breadcrumb className="ml-auto">
                <BreadcrumbList className="text-base">
                  {breadcrumbs.map((breadcrumb, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {breadcrumb.href ? (
                          <BreadcrumbLink
                            href={breadcrumb.href}
                            className="text-base"
                          >
                            {breadcrumb.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-base font-medium">
                            {breadcrumb.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </header>

          {/* Conteúdo Principal */}
          <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
        </main>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
