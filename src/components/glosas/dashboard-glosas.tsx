"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie, Legend,
} from "recharts";
import { TrendingDown, DollarSign, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { formatBRL } from "@/lib/preco-procedimento";
import {
  CATEGORIA_GLOSA_LABEL, STATUS_GLOSA_LABEL, CATEGORIA_GLOSA_COLOR,
  STATUS_GLOSA_BADGE,
} from "@/types/glosa";
import type { GlosaDashboard } from "@/types/glosa";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardGlosasProps {
  dashboard: GlosaDashboard;
}

interface TooltipEntry { name?: string; value?: number; color?: string; payload?: { status?: string; total?: number } }

function ValorTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-background border rounded shadow px-3 py-2 text-xs">
      {label && <div className="font-medium mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i}>{String(p.name ?? "")}: {formatBRL(Number(p.value ?? 0))}</div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  if (!d) return null;
  return (
    <div className="bg-background border rounded shadow px-3 py-2 text-xs">
      <div>{STATUS_GLOSA_LABEL[d.status as keyof typeof STATUS_GLOSA_LABEL] ?? d.status}: {d.total}</div>
    </div>
  );
}

function LineTooltipComp({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-background border rounded shadow px-3 py-2 text-xs space-y-1">
      {label && <div className="font-medium">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: String(p.color ?? "#000") }}>
          {p.name === "glosado" ? "Glosado" : "Recuperado"}: {formatBRL(Number(p.value ?? 0))}
        </div>
      ))}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  PENDENTE: "#eab308", EM_RECURSO: "#3b82f6", RECUPERADA: "#22c55e",
  PARCIAL: "#14b8a6", NEGADA: "#ef4444", ACATADA: "#9ca3af",
};

export function DashboardGlosas({ dashboard }: DashboardGlosasProps) {
  const { resumo, por_categoria, por_convenio, por_status, evolucao_mensal } = dashboard;
  const pctRecup = Math.round(resumo.taxa_recuperacao * 100);
  const pctGlosa = Math.round(resumo.taxa_glosa * 100);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" />
              Total de Glosas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{resumo.total_glosas}</div>
            <p className="text-xs text-muted-foreground mt-0.5">{resumo.pendentes} pendentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Valor Glosado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatBRL(resumo.valor_glosado_total)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pctGlosa > 0 ? `${pctGlosa}% do faturado` : "no período"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Recuperado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatBRL(resumo.valor_recuperado_total)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">via recurso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Em Recurso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatBRL(resumo.valor_em_recurso)}</div>
            <p className="text-xs text-muted-foreground mt-0.5">aguardando resposta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Taxa Recuperação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pctRecup >= 70 ? "text-green-600" : pctRecup >= 40 ? "text-amber-600" : "text-red-600"}`}>
              {pctRecup}%
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">do valor recorrido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Taxa de Glosa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pctGlosa <= 5 ? "text-green-600" : pctGlosa <= 15 ? "text-amber-600" : "text-red-600"}`}>
              {pctGlosa}%
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">do faturado</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Glosas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {por_categoria.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={por_categoria.sort((a, b) => b.valor - a.valor)} layout="vertical" margin={{ left: 8, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => formatBRL(v).replace("R$ ", "")} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="categoria" tickFormatter={(v: string) => CATEGORIA_GLOSA_LABEL[v as keyof typeof CATEGORIA_GLOSA_LABEL] ?? v} width={90} tick={{ fontSize: 11 }} />
                  <RTooltip content={<ValorTooltip />} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {por_categoria.map((e, i) => (
                      <Cell key={i} fill={CATEGORIA_GLOSA_COLOR[e.categoria] ?? "#9ca3af"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Por convênio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Glosas por Convênio</CardTitle>
          </CardHeader>
          <CardContent>
            {por_convenio.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={por_convenio.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => formatBRL(v).replace("R$ ", "")} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 11 }} />
                  <RTooltip content={<ValorTooltip />} />
                  <Bar dataKey="valor" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status (pizza) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Status das Glosas</CardTitle>
          </CardHeader>
          <CardContent>
            {por_status.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados no período.</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie data={por_status} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={70}>
                      {por_status.map((e, i) => (
                        <Cell key={i} fill={STATUS_COLOR[e.status] ?? "#9ca3af"} />
                      ))}
                    </Pie>
                    <RTooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {por_status.map((e) => (
                    <div key={e.status} className="flex items-center justify-between text-xs">
                      <Badge variant="outline" className={cn("text-xs border", STATUS_GLOSA_BADGE[e.status as keyof typeof STATUS_GLOSA_BADGE])}>
                        {STATUS_GLOSA_LABEL[e.status as keyof typeof STATUS_GLOSA_LABEL] ?? e.status}
                      </Badge>
                      <span className="font-medium tabular-nums">{e.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evolução mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Evolução Mensal (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={evolucao_mensal} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <RTooltip content={<LineTooltipComp />} />
                <Legend formatter={(v) => v === "glosado" ? "Glosado" : "Recuperado"} />
                <Line type="monotone" dataKey="glosado" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="recuperado" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
