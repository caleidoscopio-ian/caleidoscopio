"use client";

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
import { Panel, StatCard } from "@/components/kit";

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
      <div className="anim-escalonada grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          tom="blue"
          size="sm"
          icone={<TrendingDown />}
          rotulo="Total de Glosas"
          valor={<span className="text-danger-ink">{resumo.total_glosas}</span>}
          hint={<>{resumo.pendentes} pendentes</>}
        />

        <StatCard
          tom="lavender"
          size="sm"
          icone={<DollarSign />}
          rotulo="Valor Glosado"
          valor={<span className="text-danger-ink">{formatBRL(resumo.valor_glosado_total)}</span>}
          hint={pctGlosa > 0 ? `${pctGlosa}% do faturado` : "no período"}
        />

        <StatCard
          tom="mint"
          size="sm"
          icone={<CheckCircle2 />}
          rotulo="Recuperado"
          valor={<span className="text-success-ink">{formatBRL(resumo.valor_recuperado_total)}</span>}
          hint="via recurso"
        />

        <StatCard
          tom="peach"
          size="sm"
          icone={<Clock />}
          rotulo="Em Recurso"
          valor={<span className="text-brand">{formatBRL(resumo.valor_em_recurso)}</span>}
          hint="aguardando resposta"
        />

        <StatCard
          tom="blue"
          size="sm"
          icone={<RefreshCw />}
          rotulo="Taxa Recuperação"
          valor={
            <span
              className={
                pctRecup >= 70
                  ? "text-success-ink"
                  : pctRecup >= 40
                    ? "text-warning-ink"
                    : "text-danger-ink"
              }
            >
              {pctRecup}%
            </span>
          }
          hint="do valor recorrido"
        />

        <StatCard
          tom="lavender"
          size="sm"
          icone={<AlertCircle />}
          rotulo="Taxa de Glosa"
          valor={
            <span
              className={
                pctGlosa <= 5
                  ? "text-success-ink"
                  : pctGlosa <= 15
                    ? "text-warning-ink"
                    : "text-danger-ink"
              }
            >
              {pctGlosa}%
            </span>
          }
          hint="do faturado"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por categoria */}
        <Panel titulo="Glosas por Categoria">
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
        </Panel>

        {/* Por convênio */}
        <Panel titulo="Glosas por Convênio">
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
        </Panel>

        {/* Status (pizza) */}
        <Panel titulo="Status das Glosas">
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
        </Panel>

        {/* Evolução mensal */}
        <Panel titulo="Evolução Mensal (últimos 6 meses)">
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
        </Panel>
      </div>
    </div>
  );
}
