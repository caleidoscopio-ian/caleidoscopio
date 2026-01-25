"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Profissional {
  id: string;
  nome: string;
  especialidade: string;
}

interface FiltrosRelatorioProps {
  onBuscar: (filtros: {
    profissionais: string[];
    dataInicio: string;
    dataFim: string;
    tipo: string;
    status: string;
  }) => void;
}

export function FiltrosRelatorio({ onBuscar }: FiltrosRelatorioProps) {
  const { user } = useAuth();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [status, setStatus] = useState("todos");

  useEffect(() => {
    fetchProfissionais();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfissionais = async () => {
    try {
      if (!user) return;

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/terapeutas", {
        headers: {
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (result.success) {
        setProfissionais(result.data);
      }
    } catch (error) {
      console.error("Erro ao buscar profissionais:", error);
    }
  };

  const handleProfissionalToggle = (profissionalId: string) => {
    setProfissionaisSelecionados((prev) =>
      prev.includes(profissionalId)
        ? prev.filter((id) => id !== profissionalId)
        : [...prev, profissionalId]
    );
  };

  const setPeriodoPreDefinido = (periodo: string) => {
    const hoje = new Date();
    let inicio = new Date();

    switch (periodo) {
      case "hoje":
        inicio = hoje;
        break;
      case "semana":
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 7);
        break;
      case "mes":
        inicio = new Date(hoje);
        inicio.setMonth(hoje.getMonth() - 1);
        break;
      case "30dias":
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 30);
        break;
    }

    setDataInicio(inicio.toISOString().split("T")[0]);
    setDataFim(hoje.toISOString().split("T")[0]);
  };

  const handleBuscar = () => {
    onBuscar({
      profissionais: profissionaisSelecionados,
      dataInicio,
      dataFim,
      tipo,
      status,
    });
  };

  const handleLimpar = () => {
    setProfissionaisSelecionados([]);
    setDataInicio("");
    setDataFim("");
    setTipo("todos");
    setStatus("todos");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Profissionais - Multi-select com checkboxes */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label>Profissionais</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
              {profissionais.map((prof) => (
                <div key={prof.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={prof.id}
                    checked={profissionaisSelecionados.includes(prof.id)}
                    onCheckedChange={() => handleProfissionalToggle(prof.id)}
                  />
                  <label
                    htmlFor={prof.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {prof.nome} - {prof.especialidade}
                  </label>
                </div>
              ))}
            </div>
            {profissionaisSelecionados.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {profissionaisSelecionados.length} selecionado(s)
              </p>
            )}
          </div>

          {/* Período Pré-definido */}
          <div className="space-y-2">
            <Label>Período Rápido</Label>
            <Select onValueChange={setPeriodoPreDefinido}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Última semana</SelectItem>
                <SelectItem value="mes">Último mês</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Início */}
          <div className="space-y-2">
            <Label htmlFor="dataInicio">Data Início</Label>
            <Input
              id="dataInicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          {/* Data Fim */}
          <div className="space-y-2">
            <Label htmlFor="dataFim">Data Fim</Label>
            <Input
              id="dataFim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          {/* Tipo de Sessão */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Sessão</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="curriculum">Plano Terapêutico</SelectItem>
                <SelectItem value="atividade">Atividade</SelectItem>
                <SelectItem value="avaliacao">Avaliação</SelectItem>
                <SelectItem value="agendamento">Agendamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="FINALIZADA">Concluídas</SelectItem>
                <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
                <SelectItem value="CANCELADA">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleLimpar}>
            <X className="mr-2 h-4 w-4" />
            Limpar
          </Button>
          <Button onClick={handleBuscar}>
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
