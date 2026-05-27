/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/main-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CalendarDays, LayoutGrid, BarChart2, Map } from 'lucide-react'
import { MapaDiario } from '@/components/salas/mapa-diario'
import { MapaSemanal } from '@/components/salas/mapa-semanal'
import { DashboardOcupacao } from '@/components/salas/dashboard-ocupacao'
import { MapaFiliais } from '@/components/salas/mapa-filiais'
import { useFilialContext } from '@/contexts/filial-context'

export default function MapaOcupacaoPage() {
  const router = useRouter()
  const { filialAtiva } = useFilialContext()
  const [filialFiltro, setFilialFiltro] = useState<string | null>(filialAtiva?.id ?? null)

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Salas', href: '/salas' },
    { label: 'Mapa de Ocupação' },
  ]

  const handleFilialSelect = (id: string | null) => {
    setFilialFiltro(id)
  }

  return (
    <ProtectedRoute requiredPermission={{ resource: 'salas', action: 'VIEW' }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/salas')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Mapa de Ocupação</h1>
              <p className="text-sm text-muted-foreground">
                Visibilidade em tempo real da utilização das salas
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="diario" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full max-w-lg">
              <TabsTrigger value="diario" className="gap-2 text-xs">
                <CalendarDays className="h-3.5 w-3.5" />
                Diário
              </TabsTrigger>
              <TabsTrigger value="semanal" className="gap-2 text-xs">
                <LayoutGrid className="h-3.5 w-3.5" />
                Semanal
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-2 text-xs">
                <BarChart2 className="h-3.5 w-3.5" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="mapa" className="gap-2 text-xs">
                <Map className="h-3.5 w-3.5" />
                Unidades
              </TabsTrigger>
            </TabsList>

            <TabsContent value="diario" className="mt-0">
              <MapaDiario filialId={filialFiltro} />
            </TabsContent>

            <TabsContent value="semanal" className="mt-0">
              <MapaSemanal filialId={filialFiltro} />
            </TabsContent>

            <TabsContent value="dashboard" className="mt-0">
              <DashboardOcupacao filialId={filialFiltro} />
            </TabsContent>

            <TabsContent value="mapa" className="mt-0">
              <MapaFiliais
                filialSelecionada={filialFiltro}
                onFilialSelect={handleFilialSelect}
              />
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
