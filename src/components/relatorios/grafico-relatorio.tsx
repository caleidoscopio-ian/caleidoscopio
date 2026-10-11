"use client";

// Gráfico do primeiro nível do agrupamento (Módulo 25, Fase 5).
//
// Três regras que moldam tudo aqui:
//
//  1. UMA métrica por vez. "Atendimentos" e "Valor total" têm escalas
//     diferentes; plotar as duas juntas exigiria dois eixos y, que é o erro
//     clássico de gráfico — a comparação visual passa a depender de onde cada
//     eixo foi ancorado. Quem quer ver outra métrica troca no seletor.
//
//  2. Cores em ordem fixa, no máximo 6. A ordem dos slots é o que garante
//     separação para daltonismo (validada, ver globals.css); gerar uma 7ª cor
//     quebraria isso. Do 7º grupo em diante, "Outros".
//
//  3. Valor nulo não é zero. Grupo sem valor sai do gráfico e é contado numa
//     nota — desenhar uma barra zerada afirmaria algo que o dado não diz.
//
// A tabela agrupada logo abaixo é também a "visão em tabela" que atende a regra
// de alívio de contraste do modo claro.

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatarMetrica } from "@/lib/relatorios/formatacao";
import type { Dimensao, GrupoRelatorio, Metrica } from "@/types/relatorio";
import type { TipoGrafico } from "@/hooks/usePreferenciasRelatorio";

/** Seis slots: é o tamanho da paleta validada. Nunca gerar cor nova. */
const MAX_SERIES = 6;
const COR = (i: number) => `var(--viz-serie-${(i % MAX_SERIES) + 1})`;
const ROTULO_OUTROS = "Outros";

/** Métrica somável — a única que pode virar empilhamento ou fatia de pizza.
 *  Empilhar ou fatiar uma razão (ticket médio) não significa nada. */
const somavel = (m: Metrica) => m.agregacao !== "razao";

/** Linha do gráfico: `rotulo` mais uma chave por série */
type LinhaGrafico = Record<string, string | number>;

/** Um grupo do primeiro nível, já com o valor da métrica escolhida */
type ItemNivel = { rotulo: string; valor: number };

interface Props {
  grupos: GrupoRelatorio[];
  agrupamento: string[];
  dimensoes: Dimensao[];
  metricas: Metrica[];
  /** chaves das métricas que o usuário deixou visíveis */
  colunas: string[];
  tipo: TipoGrafico;
}

export function GraficoRelatorio({
  grupos,
  agrupamento,
  dimensoes,
  metricas,
  colunas,
  tipo,
}: Props) {
  const disponiveis = useMemo(
    () => metricas.filter((m) => colunas.includes(m.chave)),
    [metricas, colunas]
  );

  // Começa na primeira métrica de dinheiro somável — é a que a clínica olha
  const inicial =
    disponiveis.find((m) => m.tipo === "moeda" && somavel(m))?.chave ??
    disponiveis.find(somavel)?.chave ??
    disponiveis[0]?.chave ??
    "";

  const [chaveMetrica, setChaveMetrica] = useState(inicial);
  const metrica =
    disponiveis.find((m) => m.chave === chaveMetrica) ??
    disponiveis.find((m) => m.chave === inicial) ??
    disponiveis[0];

  const rotuloNivel = (i: number) =>
    dimensoes.find((d) => d.chave === agrupamento[i])?.rotulo ?? agrupamento[i] ?? "";

  // ── dados do primeiro nível, sem os grupos sem valor
  // `LinhaGrafico` é o formato comum das duas formas de barra; sem isso o
  // Recharts infere um tipo por ramo e as duas não casam.
  const { dados, semValor } = useMemo(() => {
    if (!metrica) return { dados: [] as ItemNivel[], semValor: 0 };
    const comValor = grupos.filter((g) => typeof g.metricas[metrica.chave] === "number");
    return {
      dados: comValor.map(
        (g): ItemNivel => ({ rotulo: g.rotulo, valor: g.metricas[metrica.chave] as number })
      ),
      semValor: grupos.length - comValor.length,
    };
  }, [grupos, metrica]);

  // ── séries do empilhamento (segundo nível), top 6 + Outros
  const empilhado = useMemo(() => {
    if (!metrica || agrupamento.length < 2) return null;
    const totalPorSerie = new Map<string, number>();
    for (const g of grupos) {
      for (const s of g.subgrupos) {
        const v = s.metricas[metrica.chave];
        if (typeof v === "number") totalPorSerie.set(s.rotulo, (totalPorSerie.get(s.rotulo) ?? 0) + v);
      }
    }
    const ordenadas = [...totalPorSerie.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const principais = ordenadas.slice(0, MAX_SERIES - (ordenadas.length > MAX_SERIES ? 1 : 0));
    const series = ordenadas.length > MAX_SERIES ? [...principais, ROTULO_OUTROS] : principais;

    const linhas: LinhaGrafico[] = grupos.map((g) => {
      const linha: LinhaGrafico = { rotulo: g.rotulo };
      for (const s of series) linha[s] = 0;
      for (const s of g.subgrupos) {
        const v = s.metricas[metrica.chave];
        if (typeof v !== "number") continue;
        const alvo = principais.includes(s.rotulo) ? s.rotulo : ROTULO_OUTROS;
        if (alvo in linha) linha[alvo] = (linha[alvo] as number) + v;
      }
      return linha;
    });

    return { series, linhas };
  }, [grupos, agrupamento, metrica]);

  // ── fatias da pizza, top 6 + Outros
  const pizza = useMemo(() => {
    if (dados.length === 0) return [];
    const ordenado = [...dados].sort((a, b) => b.valor - a.valor);
    if (ordenado.length <= MAX_SERIES) return ordenado.map((d) => ({ rotulo: d.rotulo, valor: d.valor }));
    const principais = ordenado.slice(0, MAX_SERIES - 1);
    const resto = ordenado.slice(MAX_SERIES - 1).reduce((s, d) => s + d.valor, 0);
    return [
      ...principais.map((d) => ({ rotulo: d.rotulo, valor: d.valor })),
      { rotulo: ROTULO_OUTROS, valor: resto },
    ];
  }, [dados]);

  if (tipo === "nenhum" || !metrica || grupos.length === 0) return null;

  // Um grupo só não é gráfico, é um número: a tabela já mostra melhor
  if (dados.length < 2 && tipo !== "barras-empilhadas") return null;

  // Empilhado exige segundo nível; pizza e razão não combinam
  const tipoEfetivo: TipoGrafico =
    tipo === "barras-empilhadas" && (!empilhado || !somavel(metrica))
      ? "barras"
      : tipo === "pizza" && (!somavel(metrica) || pizza.length < 2 || dados.some((d) => d.valor < 0))
        ? "barras"
        : tipo;

  const fmt = (v: number | null) => formatarMetrica(v, metrica.tipo);
  const totalPizza = pizza.reduce((s, p) => s + p.valor, 0);
  // Anotação explícita: sem ela o Recharts infere um tipo de linha por ramo e
  // as duas formas de barra deixam de ser compatíveis.
  const dadosBarra: LinhaGrafico[] =
    tipoEfetivo === "barras-empilhadas" && empilhado ? empilhado.linhas : dados;

  return (
    <div className="viz-relatorio rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">
            {metrica.rotulo} por {rotuloNivel(0).toLowerCase()}
          </h2>
          <p className="text-xs text-muted-foreground">
            {tipoEfetivo === "barras-empilhadas"
              ? `Empilhado por ${rotuloNivel(1).toLowerCase()}`
              : tipoEfetivo === "pizza"
                ? "Participação no total"
                : "Primeiro nível do agrupamento"}
          </p>
        </div>
        {disponiveis.length > 1 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Métrica</Label>
            <Select value={metrica.chave} onValueChange={setChaveMetrica}>
              <SelectTrigger className="h-8 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {disponiveis.map((m) => (
                  <SelectItem key={m.chave} value={m.chave}>
                    {m.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {tipoEfetivo === "pizza" ? (
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0];
                  const v = typeof p.value === "number" ? p.value : null;
                  const share = v !== null && totalPizza > 0 ? (v / totalPizza) * 100 : null;
                  return (
                    <DicaTooltip
                      titulo={String(p.name ?? "")}
                      linhas={[
                        { rotulo: metrica.rotulo, valor: fmt(v) },
                        ...(share !== null
                          ? [{ rotulo: "Participação", valor: `${share.toFixed(1).replace(".", ",")}%` }]
                          : []),
                      ]}
                    />
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={28}
                formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
              />
              <Pie
                data={pizza}
                dataKey="valor"
                nameKey="rotulo"
                innerRadius={0}
                outerRadius={92}
                // 2px da cor da superfície separando as fatias — é o vão,
                // não um contorno: a cor é a do fundo do cartão
                stroke="var(--viz-superficie)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {pizza.map((p, i) => (
                  <Cell key={p.rotulo} fill={COR(i)} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <BarChart
              data={dadosBarra}
              margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
              barCategoryGap="28%"
            >
              {/* grade só na horizontal, hairline, sólida e recessiva */}
              <CartesianGrid
                vertical={false}
                stroke="var(--viz-grade)"
                strokeWidth={1}
              />
              <XAxis
                dataKey="rotulo"
                tick={{ fontSize: 11, fill: "var(--viz-eixo)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--viz-grade)" }}
                interval={0}
                height={48}
                angle={dados.length > 5 ? -20 : 0}
                textAnchor={dados.length > 5 ? "end" : "middle"}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--viz-eixo)" }}
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(v: number) => formatarMetrica(v, metrica.tipo)}
              />
              <Tooltip
                cursor={{ fill: "var(--viz-grade)", fillOpacity: 0.35 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const linhas = payload
                    .filter((p) => typeof p.value === "number" && p.value !== 0)
                    .map((p) => ({
                      rotulo: String(p.name ?? metrica.rotulo),
                      valor: fmt(typeof p.value === "number" ? p.value : null),
                      cor: typeof p.color === "string" ? p.color : undefined,
                    }));
                  return <DicaTooltip titulo={String(label ?? "")} linhas={linhas} />;
                }}
              />
              {tipoEfetivo === "barras-empilhadas" ? (
                <>
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>}
                  />
                  {empilhado!.series.map((s, i) => (
                    <Bar
                      key={s}
                      dataKey={s}
                      stackId="total"
                      fill={COR(i)}
                      maxBarSize={24}
                      // vão de 2px na cor da superfície entre os segmentos
                      stroke="var(--viz-superficie)"
                      strokeWidth={2}
                      isAnimationActive={false}
                      // ponta arredondada só no topo da pilha
                      radius={i === empilhado!.series.length - 1 ? [4, 4, 0, 0] : undefined}
                    />
                  ))}
                </>
              ) : (
                // Série única: sem legenda — o título já diz o que está plotado
                <Bar
                  dataKey="valor"
                  name={metrica.rotulo}
                  fill="var(--viz-serie-1)"
                  maxBarSize={24}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {(semValor > 0 || tipoEfetivo !== tipo) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {semValor > 0 &&
            `${semValor} ${semValor === 1 ? "grupo" : "grupos"} sem valor ${
              semValor === 1 ? "não aparece" : "não aparecem"
            } no gráfico — "—" não é zero. `}
          {tipoEfetivo !== tipo &&
            (tipo === "pizza"
              ? "Pizza não se aplica a esta métrica; mostrando em barras."
              : "Empilhamento precisa de um segundo nível de agrupamento; mostrando em barras.")}
        </p>
      )}
    </div>
  );
}

function DicaTooltip({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: { rotulo: string; valor: string; cor?: string }[];
}) {
  return (
    <div className="rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{titulo}</p>
      <div className="mt-1 space-y-0.5">
        {linhas.map((l) => (
          <div key={l.rotulo} className="flex items-center gap-1.5">
            {l.cor && (
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: l.cor }}
                aria-hidden
              />
            )}
            <span className="text-muted-foreground">{l.rotulo}:</span>
            <span className="font-medium tabular-nums text-popover-foreground">{l.valor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
