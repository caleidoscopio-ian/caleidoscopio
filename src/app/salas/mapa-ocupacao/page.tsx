'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/main-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays, LayoutGrid, BarChart2, Map } from 'lucide-react'
import { MapaDiario } from '@/components/salas/mapa-diario'
import { MapaSemanal } from '@/components/salas/mapa-semanal'
import { DashboardOcupacao } from '@/components/salas/dashboard-ocupacao'
import { MapaFiliais } from '@/components/salas/mapa-filiais'
import { useFilialContext } from '@/contexts/filial-context'
import { PageHeader } from '@/components/kit'

export default function MapaOcupacaoPage() {
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
          <PageHeader
            voltar={{ href: "/salas" }}
            titulo="Mapa de Ocupação"
            subtitulo="Visibilidade em tempo real da utilização das salas"
          />

          {/* Tabs */}
          {/* Dashboard primeiro: a tela abre nos indicadores de capacidade, que
              é a pergunta de gestão. Diário e semanal são a operação do dia. */}
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dashboard" className="gap-2 text-xs">
                <BarChart2 className="h-3.5 w-3.5" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="diario" className="gap-2 text-xs">
                <CalendarDays className="h-3.5 w-3.5" />
                Diário
              </TabsTrigger>
              <TabsTrigger value="semanal" className="gap-2 text-xs">
                <LayoutGrid className="h-3.5 w-3.5" />
                Semanal
              </TabsTrigger>
              <TabsTrigger value="mapa" className="gap-2 text-xs">
                <Map className="h-3.5 w-3.5" />
                Unidades
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-0">
              <DashboardOcupacao filialId={filialFiltro} />
            </TabsContent>

            <TabsContent value="diario" className="mt-0">
              <MapaDiario filialId={filialFiltro} />
            </TabsContent>

            <TabsContent value="semanal" className="mt-0">
              <MapaSemanal filialId={filialFiltro} />
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
