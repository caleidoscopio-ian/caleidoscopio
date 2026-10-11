"use client";

// Barra de filtros compartilhada por todos os relatórios da central.
//
// Quais campos aparecem vem de `definicao.filtros` no catálogo — a barra não
// conhece nenhum relatório em particular. Período é sempre obrigatório.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { CalendarIcon, RotateCcw, Search } from "lucide-react";
import { endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ChaveFiltro, DefinicaoRelatorio } from "@/lib/relatorios/definicoes";
import type { FiltrosRelatorio, OpcoesRelatorio } from "@/types/relatorio";

type AtalhoPeriodo = "7d" | "30d" | "mes" | "mes-anterior" | "90d" | "custom";

const TODOS = "__todos__";

export const filtrosIniciais = (): FiltrosRelatorio => ({
  dataInicio: subDays(new Date(), 29),
  dataFim: new Date(),
  filialId: null,
  profissionalId: null,
  convenioId: null,
  especialidade: null,
  procedimentoId: null,
});

interface Props {
  definicao: DefinicaoRelatorio;
  opcoes: OpcoesRelatorio | null;
  loading?: boolean;
  onFiltrar: (f: FiltrosRelatorio) => void;
}

export function BarraFiltros({ definicao, opcoes, loading, onFiltrar }: Props) {
  const [filtros, setFiltros] = useState<FiltrosRelatorio>(filtrosIniciais);
  const [atalho, setAtalho] = useState<AtalhoPeriodo>("30d");

  const temFiltro = (c: ChaveFiltro) => definicao.filtros.includes(c);

  // Usuário sem permissão de trocar filial fica preso à própria: o seletor
  // reflete isso em vez de oferecer uma opção que a API vai ignorar.
  useEffect(() => {
    if (opcoes && !opcoes.podeTrocarFilial && opcoes.filialFixa) {
      setFiltros((f) => (f.filialId === opcoes.filialFixa ? f : { ...f, filialId: opcoes.filialFixa }));
    }
  }, [opcoes]);

  const aplicarAtalho = (a: AtalhoPeriodo) => {
    setAtalho(a);
    const hoje = new Date();
    const faixa: Partial<FiltrosRelatorio> =
      a === "7d"
        ? { dataInicio: subDays(hoje, 6), dataFim: hoje }
        : a === "30d"
          ? { dataInicio: subDays(hoje, 29), dataFim: hoje }
          : a === "90d"
            ? { dataInicio: subDays(hoje, 89), dataFim: hoje }
            : a === "mes"
              ? { dataInicio: startOfMonth(hoje), dataFim: endOfMonth(hoje) }
              : a === "mes-anterior"
                ? {
                    dataInicio: startOfMonth(subMonths(hoje, 1)),
                    dataFim: endOfMonth(subMonths(hoje, 1)),
                  }
                : {};
    if (Object.keys(faixa).length > 0) setFiltros((f) => ({ ...f, ...faixa }));
  };

  const limpar = () => {
    const base = filtrosIniciais();
    if (opcoes && !opcoes.podeTrocarFilial) base.filialId = opcoes.filialFixa;
    setFiltros(base);
    setAtalho("30d");
    onFiltrar(base);
  };

  const selecionar = (chave: keyof FiltrosRelatorio) => (valor: string) =>
    setFiltros((f) => ({ ...f, [chave]: valor === TODOS ? null : valor }));

  const atalhos: { chave: AtalhoPeriodo; rotulo: string }[] = [
    { chave: "7d", rotulo: "7 dias" },
    { chave: "30d", rotulo: "30 dias" },
    { chave: "90d", rotulo: "90 dias" },
    { chave: "mes", rotulo: "Este mês" },
    { chave: "mes-anterior", rotulo: "Mês anterior" },
  ];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Período */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Período</Label>
          <div className="flex flex-wrap gap-1.5">
            {atalhos.map((a) => (
              <Button
                key={a.chave}
                type="button"
                size="sm"
                variant={atalho === a.chave ? "default" : "outline"}
                onClick={() => aplicarAtalho(a.chave)}
              >
                {a.rotulo}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">De</Label>
          <SeletorData
            valor={filtros.dataInicio}
            onChange={(d) => {
              setFiltros((f) => ({ ...f, dataInicio: d }));
              setAtalho("custom");
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Até</Label>
          <SeletorData
            valor={filtros.dataFim}
            onChange={(d) => {
              setFiltros((f) => ({ ...f, dataFim: d }));
              setAtalho("custom");
            }}
          />
        </div>
      </div>

      {/* Demais filtros, conforme o catálogo.
          Flex em vez de grid: o `SelectTrigger` do shadcn é `w-fit`, então numa
          grade de colunas largas cada campo encolhia para o tamanho de "Todos"
          e sobrava um vão enorme dentro da célula. Empacotando lado a lado com
          largura fixa, os campos ficam juntos e quebram linha quando precisam. */}
      <div className="flex flex-wrap items-end gap-3">
        {temFiltro("filialId") && (
          <CampoSelect
            rotulo="Filial"
            valor={filtros.filialId}
            desabilitado={!opcoes?.podeTrocarFilial}
            dica={
              opcoes && !opcoes.podeTrocarFilial
                ? "Seu perfil vê apenas a própria filial"
                : undefined
            }
            opcoes={(opcoes?.filiais ?? []).map((f) => ({ valor: f.id, rotulo: f.nome }))}
            onChange={selecionar("filialId")}
          />
        )}
        {temFiltro("profissionalId") && (
          <CampoSelect
            rotulo="Profissional"
            valor={filtros.profissionalId}
            opcoes={(opcoes?.profissionais ?? []).map((p) => ({ valor: p.id, rotulo: p.nome }))}
            onChange={selecionar("profissionalId")}
          />
        )}
        {temFiltro("especialidade") && (
          <CampoSelect
            rotulo="Especialidade"
            valor={filtros.especialidade}
            opcoes={(opcoes?.especialidades ?? []).map((e) => ({ valor: e, rotulo: e }))}
            onChange={selecionar("especialidade")}
          />
        )}
        {temFiltro("convenioId") && (
          <CampoSelect
            rotulo="Parceiro de negócio"
            valor={filtros.convenioId}
            // "Particular" é uma opção de verdade, não ausência de convênio
            opcoes={[
              { valor: "particular", rotulo: "Particular" },
              ...(opcoes?.convenios ?? []).map((c) => ({ valor: c.id, rotulo: c.nome })),
            ]}
            onChange={selecionar("convenioId")}
          />
        )}
        {temFiltro("procedimentoId") && (
          <CampoSelect
            rotulo="Procedimento"
            valor={filtros.procedimentoId}
            opcoes={(opcoes?.procedimentos ?? []).map((p) => ({ valor: p.id, rotulo: p.nome }))}
            onChange={selecionar("procedimentoId")}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={() => onFiltrar(filtros)} disabled={loading}>
          <Search className="mr-2 h-4 w-4" />
          {loading ? "Consultando..." : "Aplicar filtros"}
        </Button>
        <Button variant="ghost" onClick={limpar} disabled={loading}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      </div>
    </div>
  );
}

function SeletorData({ valor, onChange }: { valor: Date; onChange: (d: Date) => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-[150px] justify-start font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(valor, "dd/MM/yyyy", { locale: ptBR })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={valor}
          locale={ptBR}
          onSelect={(d) => {
            if (d) onChange(d);
            setAberto(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function CampoSelect({
  rotulo,
  valor,
  opcoes,
  onChange,
  desabilitado,
  dica,
}: {
  rotulo: string;
  valor: string | null;
  opcoes: { valor: string; rotulo: string }[];
  onChange: (v: string) => void;
  desabilitado?: boolean;
  dica?: string;
}) {
  return (
    // Largura fixa no desktop para os campos ficarem alinhados e próximos;
    // largura total no celular, onde cada um ocupa sua própria linha.
    <div className="w-full space-y-1.5 sm:w-[190px]">
      <Label className="text-xs text-muted-foreground">{rotulo}</Label>
      <Select value={valor ?? TODOS} onValueChange={onChange} disabled={desabilitado}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {opcoes.map((o) => (
            <SelectItem key={o.valor} value={o.valor}>
              {o.rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {dica && <p className="text-[11px] text-muted-foreground">{dica}</p>}
    </div>
  );
}
