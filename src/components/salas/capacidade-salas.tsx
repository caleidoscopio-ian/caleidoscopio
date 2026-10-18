"use client";

// Capacidade das salas: o comparativo de gestão do mapa de ocupação (Módulo 27).
//
// Responde "cabe mais um profissional?" quebrando o horário de cada sala em três
// partes que somam a capacidade:
//
//   AGENDADO                  → já está vendido
//   LIVRE COM PROFISSIONAL    → tem sala e tem gente escalada: falta agendar
//   LIVRE SEM PROFISSIONAL    → tem sala e não tem gente: cabe contratar
//
// A terceira é o número que a gestão pediu. Ela sai do cruzamento da grade da
// sala com a grade dos profissionais daquela unidade.
//
// Componente de apresentação: quem busca é o dashboard, que já tem o seletor de
// período. Dois seletores de período na mesma tela divergiriam.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CalendarCheck, DoorOpen, UserPlus } from "lucide-react";
import type { CapacidadeResposta } from "@/types/ocupacao-sala";

/** Minutos → "12h 30min", a mesma leitura usada na taxa de ocupação */
function horas(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

const pct = (parte: number, total: number) =>
  total > 0 ? `${Math.round((parte / total) * 100)}%` : "—";

interface Props {
  dados: CapacidadeResposta | null;
}

export function CapacidadeSalas({ dados }: Props) {
  if (!dados) return null;

  const {
    total,
    salas,
    filiais,
    salas_sem_grade: semGrade,
    salas_fechadas_no_periodo: fechadas,
  } = dados;

  if (salas.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Capacidade das salas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {fechadas > 0
              ? `Nenhuma sala abre nos dias selecionados — ${fechadas} ${
                  fechadas === 1 ? "sala tem horário" : "salas têm horário"
                } configurado, mas em outros dias da semana.`
              : "Nenhuma sala com horário de funcionamento configurado neste filtro. Sem o horário da sala não há capacidade para comparar — configure em Salas, no botão do relógio."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Uma barra por sala, empilhada nas três parcelas. Empilhar é legítimo aqui:
  // as três são minutos e somam exatamente a capacidade.
  const porSala = salas
    .map((s) => ({
      nome: s.nome.length > 16 ? s.nome.slice(0, 15) + "…" : s.nome,
      Agendado: Math.round((s.minutos_agendados / 60) * 10) / 10,
      "Livre c/ profissional":
        Math.round((s.minutos_livres_com_profissional / 60) * 10) / 10,
      "Livre s/ profissional":
        Math.round((s.minutos_livres_sem_profissional / 60) * 10) / 10,
    }))
    .sort(
      (a, b) =>
        b.Agendado +
        b["Livre c/ profissional"] +
        b["Livre s/ profissional"] -
        (a.Agendado + a["Livre c/ profissional"] + a["Livre s/ profissional"]),
    );

  const SERIES = [
    { chave: "Agendado", cor: "var(--viz-serie-1)" },
    { chave: "Livre c/ profissional", cor: "var(--viz-serie-4)" },
    { chave: "Livre s/ profissional", cor: "var(--viz-serie-2)" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Os quatro números da decisão */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <DoorOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Capacidade das salas
                </p>
                <p className="text-2xl font-bold">
                  {horas(total.minutos_capacidade)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {total.salas} {total.salas === 1 ? "sala" : "salas"} no
                  período
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <CalendarCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Utilizado</p>
                <p className="text-2xl font-bold">
                  {horas(total.minutos_agendados)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {pct(total.minutos_agendados, total.minutos_capacidade)} da
                  capacidade · {total.atendimentos} atend.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <CalendarCheck className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Livre com profissional
                </p>
                <p className="text-2xl font-bold">
                  {horas(total.minutos_livres_com_profissional)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  sala aberta e gente escalada, falta agendar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <UserPlus className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Livre sem profissional
                </p>
                <p className="text-2xl font-bold">
                  {horas(total.minutos_livres_sem_profissional)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  sala aberta sem ninguém escalado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teto vendável: o corte que as medidas por sala não fazem.
          Sem ele, a hora livre de uma pessoa é contada em todas as salas
          abertas ao mesmo tempo — e a sobra parece maior do que é. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Teto vendável{" "}
            <span className="font-normal text-muted-foreground">
              (uma pessoa atende uma sala por vez)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Vendável no período
              </p>
              <p className="text-xl font-bold tabular-nums">
                {horas(total.minutos_efetivos)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                de {horas(total.minutos_capacidade)} de sala aberta
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Já agendado</p>
              <p className="text-xl font-bold tabular-nums">
                {horas(total.minutos_agendados_efetivos)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {pct(total.minutos_agendados_efetivos, total.minutos_efetivos)}{" "}
                do teto
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Ainda dá para vender
              </p>
              <p className="text-xl font-bold tabular-nums text-amber-600">
                {horas(total.minutos_livres_efetivos)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                com sala e gente disponíveis ao mesmo tempo
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Gargalo de pessoal
              </p>
              <p className="text-xl font-bold tabular-nums text-emerald-700">
                {horas(total.minutos_limitados_por_pessoa)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                sala aberta sem ninguém para ocupar
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            As quatro medidas acima (por sala) tratam cada sala isoladamente,
            então a mesma hora livre de um profissional aparece em todas as
            salas abertas. Aqui o limite é contado minuto a minuto por unidade,
            como{" "}
            <span className="font-medium">
              mín(salas abertas, profissionais escalados)
            </span>
            : é o número que responde &quot;quanto ainda posso vender&quot;.
            {total.minutos_limitados_por_sala > 0 && (
              <>
                {" "}
                No sentido inverso, {horas(total.minutos_limitados_por_sala)} de
                profissional escalado ficam sem sala livre, aí o gargalo é de
                espaço.
              </>
            )}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Comparativo por sala */}
        <Card className="viz-relatorio">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Capacidade por sala
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Horas no período: agendado, livre com profissional e livre sem
              ninguém escalado
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={Math.max(220, porSala.length * 34)}
            >
              <BarChart
                data={porSala}
                layout="vertical"
                margin={{ left: 4, right: 16 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--viz-grade)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--viz-eixo)" }}
                  tickFormatter={(v: number) => `${v}h`}
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={118}
                  tick={{ fontSize: 11, fill: "var(--viz-eixo)" }}
                />
                <Tooltip
                  formatter={(v) => [`${v}h`, ""]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  formatter={(v) => (
                    <span className="text-xs text-muted-foreground">{v}</span>
                  )}
                />
                {SERIES.map((s, i) => (
                  <Bar
                    key={s.chave}
                    dataKey={s.chave}
                    stackId="cap"
                    fill={s.cor}
                    maxBarSize={22}
                    stroke="var(--viz-superficie)"
                    strokeWidth={2}
                    isAnimationActive={false}
                    radius={i === SERIES.length - 1 ? [0, 4, 4, 0] : undefined}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por filial */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por unidade</CardTitle>
            <p className="text-xs text-muted-foreground">
              Onde sobra sala sem profissional escalado
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Salas</TableHead>
                  <TableHead className="text-right">Capacidade</TableHead>
                  <TableHead className="text-right">Uso</TableHead>
                  <TableHead className="text-right">Livre s/ prof.</TableHead>
                  <TableHead className="text-right">Vendável livre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filiais.map((f) => (
                  <TableRow key={f.id ?? "_sem_filial"}>
                    <TableCell className="font-medium text-sm">
                      {f.nome}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {f.salas}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {horas(f.minutos_capacidade)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {pct(f.minutos_agendados, f.minutos_capacidade)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {horas(f.minutos_livres_sem_profissional)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {horas(f.minutos_livres_efetivos)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* O que ficou fora dos números, dito na cara */}
      {(semGrade.length > 0 ||
        fechadas > 0 ||
        total.minutos_agendados_fora > 0) && (
        <div className="space-y-1.5">
          {fechadas > 0 && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span>
                {fechadas}{" "}
                {fechadas === 1 ? "sala não abre" : "salas não abrem"} em nenhum
                dos dias selecionados e {fechadas === 1 ? "ficou" : "ficaram"}{" "}
                de fora — o horário delas é em outros dias da semana.
              </span>
            </p>
          )}
          {semGrade.length > 0 && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              <span>
                {semGrade.length}{" "}
                {semGrade.length === 1 ? "sala não tem" : "salas não têm"}{" "}
                horário de funcionamento e{" "}
                {semGrade.length === 1 ? "fica" : "ficam"} fora dos números
                acima:{" "}
                {semGrade
                  .slice(0, 6)
                  .map((s) => s.nome + (s.filial ? ` (${s.filial})` : ""))
                  .join(", ")}
                {semGrade.length > 6 ? ` e mais ${semGrade.length - 6}` : ""}.
                Configure no botão do relógio, em Salas.
              </span>
            </p>
          )}
          {total.minutos_agendados_fora > 0 && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              <span>
                {horas(total.minutos_agendados_fora)} de atendimento em horário
                em que a sala está fechada ou a grade da sala está incompleta,
                ou a marcação saiu fora do horário.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
