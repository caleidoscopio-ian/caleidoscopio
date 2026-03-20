/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Settings2,
  History,
  Search,
  Edit,
  Plus,
  Trash2,
  Save,
  ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { FaseBadge, FASE_LABELS } from "@/components/evolucao/fase-badge";
import ProtectedRoute from "@/components/ProtectedRoute";

// ============ Interfaces ============

interface InstrucaoFaseData {
  id: string;
  fase: string;
  porcentagem_acerto: number;
  qtd_sessoes_consecutivas: number;
  fase_se_atingir: string | null;
  fase_se_nao_atingir: string | null;
}

interface InstrucaoHistorico {
  id: string;
  faseAnterior: string;
  faseNova: string;
  motivo: string;
  alterado_em: string;
  alterado_por: string | null;
}

interface InstrucaoPontuacaoData {
  id: string;
  fase: string;
  ordem: number;
  sigla: string;
  grau: string;
}

interface Instrucao {
  id: string;
  ordem: number;
  texto: string;
  faseAtual: string;
  qtd_tentativas_alvo?: number;
  como_aplicar?: string | null;
  observacao?: string | null;
  procedimento_correcao?: string | null;
  materiais_utilizados?: string | null;
  fases?: InstrucaoFaseData[];
  historico?: InstrucaoHistorico[];
  pontuacoes?: InstrucaoPontuacaoData[];
}

interface Pontuacao {
  id: string;
  ordem: number;
  sigla: string;
  grau: string;
}

interface AtividadeFase {
  id: string;
  fase: string;
  porcentagem_acerto: number;
  qtd_sessoes_consecutivas: number;
  fase_se_atingir: string | null;
  fase_se_nao_atingir: string | null;
}

interface FaseHistorico {
  id: string;
  faseAnterior: string;
  faseNova: string;
  motivo: string;
  alterado_em: string;
  alterado_por: string | null;
}

interface AtividadeClone {
  id: string;
  atividadeOriginalId: string | null;
  ordem: number;
  nome: string;
  protocolo: string | null;
  habilidade: string | null;
  marco_codificacao: string | null;
  tipo_ensino: string | null;
  qtd_alvos_sessao: number | null;
  qtd_tentativas_alvo: number | null;
  faseAtual: string;
  instrucoes: Instrucao[];
  pontuacoes: Pontuacao[];
  fases: AtividadeFase[];
  historico: FaseHistorico[];
}

interface PacienteCurriculumData {
  id: string;
  curriculum: { id: string; nome: string };
  atividadesClone: AtividadeClone[];
}

interface Paciente {
  id: string;
  name: string;
}

// ============ Constants ============

const FASES_ORDEM = ["LINHA_BASE", "INTERVENCAO", "MANUTENCAO", "GENERALIZACAO"];
const SIGLAS = ["-", "AFT", "AFP", "AI", "AG", "AVE", "AVG", "+"];
const GRAUS = ["Erro", "Independente", "Alta", "Média", "Baixa"];

const breadcrumbs = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Evolução" },
];

// ============ Component ============

function EvolucaoPageContent() {
  const { user, isAuthenticated } = useAuth();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<string>("");
  const [atribuicoes, setAtribuicoes] = useState<PacienteCurriculumData[]>([]);
  const [curriculumSelecionado, setCurriculumSelecionado] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroFase, setFiltroFase] = useState<string>("TODAS");
  const [busca, setBusca] = useState("");

  // Modal states
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [cloneSelecionado, setCloneSelecionado] = useState<AtividadeClone | null>(null);
  const [detalhesTab, setDetalhesTab] = useState("detalhes");
  const [criteriosAberto, setCriteriosAberto] = useState(false);
  const [faseCriterio, setFaseCriterio] = useState<string>("");
  const [criterioForm, setCriterioForm] = useState({
    porcentagem_acerto: 80,
    qtd_sessoes_consecutivas: 1,
    fase_se_atingir: "" as string,
    fase_se_nao_atingir: "" as string,
  });
  const [salvandoCriterio, setSalvandoCriterio] = useState(false);
  const [salvandoFase, setSalvandoFase] = useState(false);
  const [instrucaoParaCriterios, setInstrucaoParaCriterios] = useState<Instrucao | null>(null);

  // Instruction detail modal states
  const [instrucaoDetalheAberto, setInstrucaoDetalheAberto] = useState(false);
  const [instrucaoSelecionada, setInstrucaoSelecionada] = useState<Instrucao | null>(null);
  const [instrucaoDetalheTab, setInstrucaoDetalheTab] = useState("evolucao");
  const [fasePontuacao, setFasePontuacao] = useState<string>("");
  const [salvandoPontuacao, setSalvandoPontuacao] = useState(false);

  // Edit clone states
  const [salvandoClone, setSalvandoClone] = useState(false);
  const [geralForm, setGeralForm] = useState({
    nome: "",
    protocolo: "",
    habilidade: "",
    marco_codificacao: "",
    tipo_ensino: "",
    qtd_alvos_sessao: 1,
    qtd_tentativas_alvo: 1,
  });
  const [instrucoesList, setInstrucoesList] = useState<Instrucao[]>([]);
  const [instrucaoDialogAberto, setInstrucaoDialogAberto] = useState(false);
  const [instrucaoEditIndex, setInstrucaoEditIndex] = useState<number | null>(null);
  const [instrucaoForm, setInstrucaoForm] = useState({
    texto: "",
    como_aplicar: "",
    observacao: "",
    procedimento_correcao: "",
    materiais_utilizados: "",
  });
  const [pontuacoesList, setPontuacoesList] = useState<Pontuacao[]>([]);
  const [pontuacaoDialogAberto, setPontuacaoDialogAberto] = useState(false);
  const [pontuacaoEditIndex, setPontuacaoEditIndex] = useState<number | null>(null);
  const [pontuacaoForm, setPontuacaoForm] = useState({ sigla: "", grau: "" });

  // ============ Fetch pacientes ============

  const fetchPacientes = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      setLoadingPacientes(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/pacientes", {
        headers: {
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();
      if (result.success) {
        setPacientes(result.data || []);
      }
    } catch (err) {
      console.error("Erro ao buscar pacientes:", err);
    } finally {
      setLoadingPacientes(false);
    }
  }, [isAuthenticated, user]);

  // ============ Fetch evolução ============

  const fetchEvolucao = useCallback(async (autoSelectFirst = false) => {
    if (!isAuthenticated || !user || !pacienteSelecionado) return;

    try {
      setLoading(true);
      setError(null);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(
        `/api/evolucao?pacienteId=${pacienteSelecionado}`,
        {
          headers: {
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setAtribuicoes(result.data || []);
        if (autoSelectFirst && result.data.length > 0) {
          setCurriculumSelecionado(result.data[0].id);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Erro ao buscar evolução:", err);
      setError("Erro ao carregar dados de evolução");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, pacienteSelecionado]);

  // ============ Salvar critérios ============

  const salvarCriterios = async () => {
    if (!user || !cloneSelecionado) return;

    try {
      setSalvandoCriterio(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const body = instrucaoParaCriterios
        ? {
            instrucaoId: instrucaoParaCriterios.id,
            fase: faseCriterio,
            ...criterioForm,
            fase_se_atingir: criterioForm.fase_se_atingir || null,
            fase_se_nao_atingir: criterioForm.fase_se_nao_atingir || null,
          }
        : {
            atividadeCloneId: cloneSelecionado.id,
            fase: faseCriterio,
            ...criterioForm,
            fase_se_atingir: criterioForm.fase_se_atingir || null,
            fase_se_nao_atingir: criterioForm.fase_se_nao_atingir || null,
          };

      const response = await fetch("/api/evolucao/criterios", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (result.success) {
        await fetchEvolucao();
        setCriteriosAberto(false);
        setInstrucaoParaCriterios(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Erro ao salvar critérios:", err);
      setError("Erro ao salvar critérios");
    } finally {
      setSalvandoCriterio(false);
    }
  };

  // ============ Abrir critérios por instrução ============

  const abrirCriteriosInstrucao = (instrucao: Instrucao, clone: AtividadeClone) => {
    setCloneSelecionado(clone);
    setInstrucaoParaCriterios(instrucao);
    setFaseCriterio(instrucao.faseAtual);

    const criterioExistente = instrucao.fases?.find((f) => f.fase === instrucao.faseAtual);
    if (criterioExistente) {
      setCriterioForm({
        porcentagem_acerto: criterioExistente.porcentagem_acerto,
        qtd_sessoes_consecutivas: criterioExistente.qtd_sessoes_consecutivas,
        fase_se_atingir: criterioExistente.fase_se_atingir || "",
        fase_se_nao_atingir: criterioExistente.fase_se_nao_atingir || "",
      });
    } else {
      setCriterioForm({
        porcentagem_acerto: 80,
        qtd_sessoes_consecutivas: 1,
        fase_se_atingir: "",
        fase_se_nao_atingir: "",
      });
    }

    setCriteriosAberto(true);
  };

  // ============ Abrir detalhes da instrução ============

  // Helper: filtra pontuações por fase e ordena com "+" sempre por último
  const filtrarPontuacoesFase = (pontuacoes: InstrucaoPontuacaoData[], fase: string) =>
    pontuacoes
      .filter((p) => p.fase === fase)
      .sort((a, b) => {
        if (a.sigla === "+") return 1;
        if (b.sigla === "+") return -1;
        return a.ordem - b.ordem;
      })
      .map((p) => ({ id: p.id, ordem: p.ordem, sigla: p.sigla, grau: p.grau }));

  const abrirDetalhesInstrucao = (instrucao: Instrucao, clone: AtividadeClone) => {
    setInstrucaoSelecionada(instrucao);
    setCloneSelecionado(clone);
    setInstrucaoDetalheTab("evolucao");
    setFasePontuacao(instrucao.faseAtual);
    setPontuacoesList(filtrarPontuacoesFase(instrucao.pontuacoes || [], instrucao.faseAtual));
    setInstrucaoDetalheAberto(true);
  };

  // Trocar fase no tab de pontuação — recarrega lista da fase selecionada
  const trocarFasePontuacao = (fase: string) => {
    if (!instrucaoSelecionada) return;
    setFasePontuacao(fase);
    setPontuacoesList(filtrarPontuacoesFase(instrucaoSelecionada.pontuacoes || [], fase));
  };

  // Salvar pontuações por instrução por fase
  const salvarPontuacoesInstrucao = async () => {
    if (!user || !instrucaoSelecionada || !fasePontuacao) return;

    try {
      setSalvandoPontuacao(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/evolucao/pontuacoes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          instrucaoId: instrucaoSelecionada.id,
          fase: fasePontuacao,
          pontuacoes: pontuacoesList.map((p) => ({
            sigla: p.sigla,
            grau: p.grau,
          })),
        }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchEvolucao();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Erro ao salvar pontuações:", err);
      setError("Erro ao salvar pontuações");
    } finally {
      setSalvandoPontuacao(false);
    }
  };

  // ============ Alterar fase de uma instrução manualmente ============

  const alterarFaseInstrucao = async (instrucaoId: string, novaFase: string) => {
    if (!user) return;

    try {
      setSalvandoFase(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/evolucao/fase", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({ instrucaoId, novaFase }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchEvolucao();
        setInstrucaoDetalheAberto(false);
        setInstrucaoSelecionada(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Erro ao alterar fase da instrução:", err);
      setError("Erro ao alterar fase");
    } finally {
      setSalvandoFase(false);
    }
  };

  // ============ Abrir detalhes da atividade (com edição) ============

  const abrirDetalhes = (clone: AtividadeClone) => {
    setCloneSelecionado(clone);
    setDetalhesTab("geral");

    // Preencher formulários de edição
    setGeralForm({
      nome: clone.nome || "",
      protocolo: clone.protocolo || "",
      habilidade: clone.habilidade || "",
      marco_codificacao: clone.marco_codificacao || "",
      tipo_ensino: clone.tipo_ensino || "",
      qtd_alvos_sessao: clone.qtd_alvos_sessao || 1,
      qtd_tentativas_alvo: clone.qtd_tentativas_alvo || 1,
    });
    setInstrucoesList(clone.instrucoes.map((i) => ({ ...i })));

    setDetalhesAberto(true);
  };

  // ============ Salvar clone (geral/instruções/pontuações) ============

  const salvarClone = async (tipo: "geral" | "instrucoes" | "pontuacoes") => {
    if (!user || !cloneSelecionado) return;

    try {
      setSalvandoClone(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const payload: Record<string, unknown> = {
        atividadeCloneId: cloneSelecionado.id,
      };

      if (tipo === "geral") {
        Object.assign(payload, geralForm);
      } else if (tipo === "instrucoes") {
        payload.instrucoes = instrucoesList.map((i) => ({
          id: i.id.startsWith("temp-") ? undefined : i.id,
          texto: i.texto,
          como_aplicar: i.como_aplicar || "",
          observacao: i.observacao || "",
          procedimento_correcao: i.procedimento_correcao || "",
          materiais_utilizados: i.materiais_utilizados || "",
        }));
      } else if (tipo === "pontuacoes") {
        payload.pontuacoes = pontuacoesList.map((p) => ({
          sigla: p.sigla,
          grau: p.grau,
        }));
      }

      const response = await fetch("/api/evolucao/clone", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        alert("Salvo com sucesso!");
        await fetchEvolucao();
        // Atualizar clone selecionado com dados retornados
        if (result.data) {
          setCloneSelecionado(result.data);
          setInstrucoesList(result.data.instrucoes || []);
          setPontuacoesList(result.data.pontuacoes || []);
        }
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (err) {
      console.error("Erro ao salvar clone:", err);
      alert("Erro ao salvar");
    } finally {
      setSalvandoClone(false);
    }
  };

  // ============ Instrução CRUD helpers ============

  const abrirInstrucaoDialog = (index?: number) => {
    if (index !== undefined) {
      const instr = instrucoesList[index];
      setInstrucaoEditIndex(index);
      setInstrucaoForm({
        texto: instr.texto,
        como_aplicar: instr.como_aplicar || "",
        observacao: instr.observacao || "",
        procedimento_correcao: instr.procedimento_correcao || "",
        materiais_utilizados: instr.materiais_utilizados || "",
      });
    } else {
      setInstrucaoEditIndex(null);
      setInstrucaoForm({
        texto: "",
        como_aplicar: "",
        observacao: "",
        procedimento_correcao: "",
        materiais_utilizados: "",
      });
    }
    setInstrucaoDialogAberto(true);
  };

  const salvarInstrucaoLocal = () => {
    if (!instrucaoForm.texto.trim()) {
      alert("O texto da instrução é obrigatório");
      return;
    }

    const novaInstrucao: Instrucao = {
      id: instrucaoEditIndex !== null ? instrucoesList[instrucaoEditIndex].id : `temp-${Date.now()}`,
      ordem: instrucaoEditIndex !== null ? instrucoesList[instrucaoEditIndex].ordem : instrucoesList.length + 1,
      faseAtual: instrucaoEditIndex !== null ? instrucoesList[instrucaoEditIndex].faseAtual : "LINHA_BASE",
      texto: instrucaoForm.texto,
      como_aplicar: instrucaoForm.como_aplicar || null,
      observacao: instrucaoForm.observacao || null,
      procedimento_correcao: instrucaoForm.procedimento_correcao || null,
      materiais_utilizados: instrucaoForm.materiais_utilizados || null,
    };

    if (instrucaoEditIndex !== null) {
      const novaLista = [...instrucoesList];
      novaLista[instrucaoEditIndex] = novaInstrucao;
      setInstrucoesList(novaLista);
    } else {
      setInstrucoesList([...instrucoesList, novaInstrucao]);
    }
    setInstrucaoDialogAberto(false);
  };

  const removerInstrucao = (index: number) => {
    const novaLista = instrucoesList.filter((_, i) => i !== index).map((instr, i) => ({
      ...instr,
      ordem: i + 1,
    }));
    setInstrucoesList(novaLista);
  };

  // ============ Pontuação CRUD helpers ============

  const abrirPontuacaoDialog = (index?: number) => {
    if (index !== undefined) {
      const pont = pontuacoesList[index];
      setPontuacaoEditIndex(index);
      setPontuacaoForm({ sigla: pont.sigla, grau: pont.grau });
    } else {
      setPontuacaoEditIndex(null);
      setPontuacaoForm({ sigla: "", grau: "" });
    }
    setPontuacaoDialogAberto(true);
  };

  const salvarPontuacaoLocal = () => {
    if (!pontuacaoForm.sigla || !pontuacaoForm.grau) {
      alert("Sigla e grau são obrigatórios");
      return;
    }

    const novaPontuacao: Pontuacao = {
      id: pontuacaoEditIndex !== null ? pontuacoesList[pontuacaoEditIndex].id : `temp-${Date.now()}`,
      ordem: pontuacaoEditIndex !== null ? pontuacoesList[pontuacaoEditIndex].ordem : pontuacoesList.length + 1,
      sigla: pontuacaoForm.sigla,
      grau: pontuacaoForm.grau,
    };

    if (pontuacaoEditIndex !== null) {
      const novaLista = [...pontuacoesList];
      novaLista[pontuacaoEditIndex] = novaPontuacao;
      setPontuacoesList(novaLista);
    } else {
      setPontuacoesList([...pontuacoesList, novaPontuacao]);
    }
    setPontuacaoDialogAberto(false);
  };

  const removerPontuacao = (index: number) => {
    const novaLista = pontuacoesList.filter((_, i) => i !== index).map((pont, i) => ({
      ...pont,
      ordem: i + 1,
    }));
    setPontuacoesList(novaLista);
  };

  // ============ Effects ============

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  useEffect(() => {
    if (pacienteSelecionado) {
      setCurriculumSelecionado("");
      fetchEvolucao(true);
    }
  }, [pacienteSelecionado]);

  // ============ Derived data ============

  const atribuicaoAtual = atribuicoes.find(
    (a) => a.id === curriculumSelecionado
  );

  const atividadesFiltradas = (atribuicaoAtual?.atividadesClone || []).filter(
    (clone) => {
      const matchFase =
        filtroFase === "TODAS" || clone.faseAtual === filtroFase;
      const matchBusca =
        !busca || clone.nome.toLowerCase().includes(busca.toLowerCase());
      return matchFase && matchBusca;
    }
  );

  // ============ Render ============

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Painel de Evolução
          </h1>
          <p className="text-muted-foreground">
            Acompanhe a evolução das atividades por fase de cada paciente
          </p>
        </div>

        {/* Seleção de Paciente e Curriculum */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Paciente</Label>
                <Select
                  value={pacienteSelecionado}
                  onValueChange={setPacienteSelecionado}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingPacientes
                          ? "Carregando..."
                          : "Selecione um paciente"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {pacientes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Plano Terapêutico</Label>
                <Select
                  value={curriculumSelecionado}
                  onValueChange={setCurriculumSelecionado}
                  disabled={!pacienteSelecionado || atribuicoes.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {atribuicoes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.curriculum.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        {atribuicaoAtual && (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Filtrar por Fase</Label>
              <Select value={filtroFase} onValueChange={setFiltroFase}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as Fases</SelectItem>
                  {FASES_ORDEM.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FASE_LABELS[f]?.label || f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1">
              <Label>Buscar atividade</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome da atividade..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando evolução...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && pacienteSelecionado && atribuicoes.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhum plano atribuído
              </h3>
              <p className="text-muted-foreground">
                Este paciente não possui planos terapêuticos atribuídos com
                atividades clonadas.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lista de Atividades */}
        {atribuicaoAtual && !loading && (
          <div className="grid gap-4">
            {atividadesFiltradas.map((clone) => {
              // Calcular progresso: % de instruções em GENERALIZACAO
              const totalInstrucoes = clone.instrucoes.length;
              const instrucoesGeneralizacao = clone.instrucoes.filter(
                (i) => i.faseAtual === "GENERALIZACAO"
              ).length;
              const progresso =
                totalInstrucoes > 0
                  ? Math.round((instrucoesGeneralizacao / totalInstrucoes) * 100)
                  : 0;

              return (
              <Card key={clone.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-semibold text-lg truncate">{clone.nome}</h3>
                      </div>

                      {/* Barra de progresso da atividade */}
                      <div className="mb-3 space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progresso da atividade</span>
                          <span className="font-medium">{progresso}% ({instrucoesGeneralizacao}/{totalInstrucoes} instrução(ões))</span>
                        </div>
                        <Progress value={progresso} className="h-2" />
                      </div>

                      {/* Instruções com fases individuais */}
                      <div className="space-y-1">
                        {clone.instrucoes.map((instrucao) => (
                          <div
                            key={instrucao.id}
                            className="flex items-center justify-between gap-2 text-sm py-1 border-b last:border-0"
                          >
                            <span className="text-muted-foreground flex-1 truncate flex items-center gap-1">
                              <ChevronRight className="h-3 w-3 flex-shrink-0" />
                              {instrucao.texto}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <FaseBadge fase={instrucao.faseAtual} />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => abrirDetalhesInstrucao(instrucao, clone)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Ver / Editar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Meta info */}
                      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                        {clone.protocolo && <span>Protocolo: {clone.protocolo}</span>}
                        {clone.habilidade && <span>Habilidade: {clone.habilidade}</span>}
                        {clone.historico.length > 0 && (
                          <span className="flex items-center gap-1">
                            <History className="h-3 w-3" />
                            {clone.historico.length} mudança(s) de fase
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirDetalhes(clone)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Ver / Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}

            {atividadesFiltradas.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    Nenhuma atividade encontrada com os filtros selecionados.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* ============ Modal Detalhes da Atividade (Geral + Instruções) ============ */}
      <Dialog open={detalhesAberto} onOpenChange={setDetalhesAberto}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {cloneSelecionado && (
            <>
              <DialogHeader>
                <DialogTitle>{cloneSelecionado.nome}</DialogTitle>
                <DialogDescription>
                  Edite os dados gerais e instruções desta atividade
                </DialogDescription>
              </DialogHeader>

              <Tabs value={detalhesTab} onValueChange={setDetalhesTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                  <TabsTrigger value="instrucoes">Instruções</TabsTrigger>
                </TabsList>

                {/* ---- Aba Geral ---- */}
                <TabsContent value="geral" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Protocolo</Label>
                      <Select
                        value={geralForm.protocolo || "SEM_PROTOCOLO"}
                        onValueChange={(v) =>
                          setGeralForm({ ...geralForm, protocolo: v === "SEM_PROTOCOLO" ? "" : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o protocolo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEM_PROTOCOLO">Nenhum</SelectItem>
                          <SelectItem value="VB-MAPP">VB-MAPP</SelectItem>
                          <SelectItem value="AFLS">AFLS</SelectItem>
                          <SelectItem value="Socially Savvy">Socially Savvy</SelectItem>
                          <SelectItem value="Barreiras comportamentais">Barreiras comportamentais</SelectItem>
                          <SelectItem value="Portage">Portage</SelectItem>
                          <SelectItem value="Denver">Denver</SelectItem>
                          <SelectItem value="Escala de Desenvolvimento Motor">Escala de Desenvolvimento Motor</SelectItem>
                          <SelectItem value="Vineland-3">Vineland-3</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Nome da Atividade <span className="text-red-500">*</span></Label>
                      <Input
                        value={geralForm.nome}
                        onChange={(e) =>
                          setGeralForm({ ...geralForm, nome: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Habilidade</Label>
                      <Select
                        value={geralForm.habilidade || "SEM_HABILIDADE"}
                        onValueChange={(v) =>
                          setGeralForm({ ...geralForm, habilidade: v === "SEM_HABILIDADE" ? "" : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a habilidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEM_HABILIDADE">Nenhuma</SelectItem>
                          <SelectItem value="Competências Sociais">Competências Sociais</SelectItem>
                          <SelectItem value="Comportamentos de Atenção Conjunta">Comportamentos de Atenção Conjunta</SelectItem>
                          <SelectItem value="Competências Sociais com Pares">Competências Sociais com Pares</SelectItem>
                          <SelectItem value="Cognição">Cognição</SelectItem>
                          <SelectItem value="Jogo">Jogo</SelectItem>
                          <SelectItem value="Jogo de Representação">Jogo de Representação</SelectItem>
                          <SelectItem value="Motricidade Fina">Motricidade Fina</SelectItem>
                          <SelectItem value="Motricidade Grossa">Motricidade Grossa</SelectItem>
                          <SelectItem value="Comportamento">Comportamento</SelectItem>
                          <SelectItem value="Comunicação Receptiva">Comunicação Receptiva</SelectItem>
                          <SelectItem value="Comunicação Expressiva">Comunicação Expressiva</SelectItem>
                          <SelectItem value="Independência Pessoal">Independência Pessoal</SelectItem>
                          <SelectItem value="Independência Pessoal:Alimentação">Independência Pessoal:Alimentação</SelectItem>
                          <SelectItem value="Independência Pessoal:Vestir">Independência Pessoal:Vestir</SelectItem>
                          <SelectItem value="Independência Pessoal:Higiene">Independência Pessoal:Higiene</SelectItem>
                          <SelectItem value="Independência Pessoal:Tarefas">Independência Pessoal:Tarefas</SelectItem>
                          <SelectItem value="Independência Pessoal:Adultos">Independência Pessoal:Adultos</SelectItem>
                          <SelectItem value="Imitação Motora">Imitação Motora</SelectItem>
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Marco/Codificação</Label>
                      <Input
                        value={geralForm.marco_codificacao}
                        onChange={(e) =>
                          setGeralForm({ ...geralForm, marco_codificacao: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Tipo de Ensino</Label>
                      <Select
                        value={geralForm.tipo_ensino || "SEM_TIPO"}
                        onValueChange={(v) =>
                          setGeralForm({ ...geralForm, tipo_ensino: v === "SEM_TIPO" ? "" : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEM_TIPO">Nenhum</SelectItem>
                          <SelectItem value="Ensino Estruturado">Ensino Estruturado</SelectItem>
                          <SelectItem value="Ensino Naturalístico">Ensino Naturalístico</SelectItem>
                          <SelectItem value="Duração">Duração</SelectItem>
                          <SelectItem value="Frequência">Frequência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Qtd. Instruções</Label>
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={geralForm.qtd_alvos_sessao}
                          onChange={(e) =>
                            setGeralForm({
                              ...geralForm,
                              qtd_alvos_sessao: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      </div>
                      {/* Tentativas agora são configuradas por instrução individual */}
                    </div>
                  </div>

                  <Button
                    onClick={() => salvarClone("geral")}
                    disabled={salvandoClone || !geralForm.nome}
                    className="w-full"
                  >
                    {salvandoClone ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Informações Gerais
                  </Button>
                </TabsContent>

                {/* ---- Aba Instruções ---- */}
                <TabsContent value="instrucoes" className="space-y-4 mt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">
                      Instruções ({instrucoesList.length})
                    </h4>
                    <Button size="sm" onClick={() => abrirInstrucaoDialog()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {instrucoesList.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhuma instrução cadastrada
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>Texto</TableHead>
                          <TableHead className="w-24 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {instrucoesList.map((instr, index) => (
                          <TableRow key={instr.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="max-w-sm truncate">
                              {instr.texto}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => abrirInstrucaoDialog(index)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removerInstrucao(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  <Button
                    onClick={() => salvarClone("instrucoes")}
                    disabled={salvandoClone}
                    className="w-full"
                  >
                    {salvandoClone ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Instruções
                  </Button>
                </TabsContent>

              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ Modal Detalhes da Instrução (Evolução + Pontuação) ============ */}
      <Dialog open={instrucaoDetalheAberto} onOpenChange={(open) => { setInstrucaoDetalheAberto(open); if (!open) setInstrucaoSelecionada(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {instrucaoSelecionada && cloneSelecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FaseBadge fase={instrucaoSelecionada.faseAtual} />
                  <span className="truncate">{instrucaoSelecionada.texto}</span>
                </DialogTitle>
                <DialogDescription>
                  Atividade: {cloneSelecionado.nome}
                </DialogDescription>
              </DialogHeader>

              <Tabs value={instrucaoDetalheTab} onValueChange={setInstrucaoDetalheTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="evolucao">Evolução</TabsTrigger>
                  <TabsTrigger value="pontuacao">Pontuação</TabsTrigger>
                </TabsList>

                {/* ---- Aba Evolução da Instrução ---- */}
                <TabsContent value="evolucao" className="space-y-6 mt-4">
                  {/* Tentativas por instrução */}
                  <div className="flex items-center gap-3">
                    <Label className="whitespace-nowrap">Tentativas por sessão</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      className="w-20"
                      value={instrucaoSelecionada.qtd_tentativas_alvo || 1}
                      onChange={async (e) => {
                        const val = parseInt(e.target.value) || 1;
                        if (!user) return;
                        const userDataEncoded = btoa(JSON.stringify(user));
                        await fetch("/api/evolucao/clone", {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            "X-User-Data": userDataEncoded,
                            "X-Auth-Token": user.token,
                          },
                          body: JSON.stringify({
                            instrucaoId: instrucaoSelecionada.id,
                            qtd_tentativas_alvo: val,
                          }),
                        });
                        // Atualizar estado local
                        setInstrucaoSelecionada({ ...instrucaoSelecionada, qtd_tentativas_alvo: val });
                        fetchEvolucao();
                      }}
                    />
                  </div>

                  {/* Critérios da fase atual */}
                  <div>
                    <h4 className="font-semibold mb-2">
                      Critérios da Fase Atual ({FASE_LABELS[instrucaoSelecionada.faseAtual]?.label || instrucaoSelecionada.faseAtual})
                    </h4>
                    {(() => {
                      const criterio = instrucaoSelecionada.fases?.find(
                        (f) => f.fase === instrucaoSelecionada.faseAtual
                      );
                      if (!criterio) return <p className="text-sm text-muted-foreground">Sem critérios configurados</p>;
                      return (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-3 bg-muted rounded text-center">
                            <div className="font-semibold text-lg">
                              {criterio.porcentagem_acerto}%
                            </div>
                            <div className="text-muted-foreground">
                              % mínima de acerto
                            </div>
                          </div>
                          <div className="p-3 bg-muted rounded text-center">
                            <div className="font-semibold text-lg">
                              {criterio.qtd_sessoes_consecutivas}
                            </div>
                            <div className="text-muted-foreground">
                              Sessões consecutivas
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Histórico de fases da instrução */}
                  {(instrucaoSelecionada.historico?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">
                        Histórico de Mudanças
                      </h4>
                      <div className="space-y-2">
                        {instrucaoSelecionada.historico?.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center gap-3 p-3 bg-muted rounded text-sm"
                          >
                            <FaseBadge fase={h.faseAnterior} size="sm" />
                            <span>→</span>
                            <FaseBadge fase={h.faseNova} size="sm" />
                            <span className="text-muted-foreground ml-auto">
                              {h.motivo === "CRITERIO_ATINGIDO"
                                ? "Critério atingido"
                                : h.motivo === "CRITERIO_NAO_ATINGIDO"
                                  ? "Critério não atingido"
                                  : "Manual"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(h.alterado_em).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botões de fase */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(() => {
                      const faseIndex = FASES_ORDEM.indexOf(instrucaoSelecionada.faseAtual);
                      const podVoltar = faseIndex > 0;
                      const podAvancar = faseIndex < FASES_ORDEM.length - 1;

                      return (
                        <>
                          {podVoltar && (
                            <Button
                              variant="outline"
                              onClick={() =>
                                alterarFaseInstrucao(
                                  instrucaoSelecionada.id,
                                  FASES_ORDEM[faseIndex - 1]
                                )
                              }
                              disabled={salvandoFase}
                            >
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Voltar Fase
                            </Button>
                          )}
                          {podAvancar && (
                            <Button
                              onClick={() =>
                                alterarFaseInstrucao(
                                  instrucaoSelecionada.id,
                                  FASES_ORDEM[faseIndex + 1]
                                )
                              }
                              disabled={salvandoFase}
                            >
                              {salvandoFase ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <ChevronUp className="h-4 w-4 mr-1" />
                              )}
                              Avançar Fase
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() =>
                              abrirCriteriosInstrucao(instrucaoSelecionada, cloneSelecionado)
                            }
                          >
                            <Settings2 className="h-4 w-4 mr-1" />
                            Editar Critérios
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                </TabsContent>

                {/* ---- Aba Pontuação da Instrução (por fase) ---- */}
                <TabsContent value="pontuacao" className="space-y-4 mt-4">
                  {/* Seletor de fase */}
                  <div className="space-y-2">
                    <Label>Fase</Label>
                    <Select value={fasePontuacao} onValueChange={trocarFasePontuacao}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FASES_ORDEM.map((f) => (
                          <SelectItem key={f} value={f}>
                            {FASE_LABELS[f]?.label || f}
                            {f === instrucaoSelecionada?.faseAtual ? " (atual)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">
                      Pontuação/Dicas ({pontuacoesList.length})
                    </h4>
                    <Button size="sm" onClick={() => abrirPontuacaoDialog()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {pontuacoesList.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhuma pontuação cadastrada para esta fase
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>Sigla</TableHead>
                          <TableHead>Grau</TableHead>
                          <TableHead className="w-24 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pontuacoesList.map((pont, index) => (
                          <TableRow key={pont.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{pont.sigla}</TableCell>
                            <TableCell>{pont.grau}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => abrirPontuacaoDialog(index)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removerPontuacao(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  <Button
                    onClick={salvarPontuacoesInstrucao}
                    disabled={salvandoPontuacao}
                    className="w-full"
                  >
                    {salvandoPontuacao ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Pontuações ({FASE_LABELS[fasePontuacao]?.label || fasePontuacao})
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ Dialog Instrução Add/Edit ============ */}
      <Dialog open={instrucaoDialogAberto} onOpenChange={setInstrucaoDialogAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {instrucaoEditIndex !== null ? "Editar Instrução" : "Nova Instrução"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Texto da Instrução <span className="text-red-500">*</span></Label>
              <Textarea
                value={instrucaoForm.texto}
                onChange={(e) =>
                  setInstrucaoForm({ ...instrucaoForm, texto: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Como Aplicar</Label>
              <Textarea
                value={instrucaoForm.como_aplicar}
                onChange={(e) =>
                  setInstrucaoForm({ ...instrucaoForm, como_aplicar: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={instrucaoForm.observacao}
                onChange={(e) =>
                  setInstrucaoForm({ ...instrucaoForm, observacao: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Procedimento de Correção</Label>
              <Textarea
                value={instrucaoForm.procedimento_correcao}
                onChange={(e) =>
                  setInstrucaoForm({ ...instrucaoForm, procedimento_correcao: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Materiais Utilizados</Label>
              <Textarea
                value={instrucaoForm.materiais_utilizados}
                onChange={(e) =>
                  setInstrucaoForm({ ...instrucaoForm, materiais_utilizados: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInstrucaoDialogAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={salvarInstrucaoLocal}>
              {instrucaoEditIndex !== null ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Dialog Pontuação Add/Edit ============ */}
      <Dialog open={pontuacaoDialogAberto} onOpenChange={setPontuacaoDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pontuacaoEditIndex !== null ? "Editar Pontuação" : "Nova Pontuação"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sigla</Label>
              <Select
                value={pontuacaoForm.sigla || "SELECIONE"}
                onValueChange={(v) =>
                  setPontuacaoForm({ ...pontuacaoForm, sigla: v === "SELECIONE" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELECIONE" disabled>Selecione</SelectItem>
                  {SIGLAS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Grau</Label>
              <Select
                value={pontuacaoForm.grau || "SELECIONE"}
                onValueChange={(v) =>
                  setPontuacaoForm({ ...pontuacaoForm, grau: v === "SELECIONE" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELECIONE" disabled>Selecione</SelectItem>
                  {GRAUS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPontuacaoDialogAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={salvarPontuacaoLocal}>
              {pontuacaoEditIndex !== null ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Modal Critérios ============ */}
      <Dialog open={criteriosAberto} onOpenChange={(open) => { setCriteriosAberto(open); if (!open) setInstrucaoParaCriterios(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Critérios de Evolução -{" "}
              {FASE_LABELS[faseCriterio]?.label || faseCriterio}
            </DialogTitle>
            <DialogDescription>
              {instrucaoParaCriterios
                ? `Instrução: "${instrucaoParaCriterios.texto}"`
                : "Configure os critérios para avançar ou regredir de fase"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>% mínima de acerto por sessão</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={criterioForm.porcentagem_acerto}
                  onChange={(e) =>
                    setCriterioForm((prev) => ({
                      ...prev,
                      porcentagem_acerto: parseFloat(e.target.value) || 80,
                    }))
                  }
                />
                <span className="text-muted-foreground font-medium">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: 80 = o paciente precisa acertar 80% das tentativas da sessão
              </p>
            </div>

            <div className="space-y-2">
              <Label>Sessões consecutivas</Label>
              <Input
                type="number"
                min={1}
                value={criterioForm.qtd_sessoes_consecutivas}
                onChange={(e) =>
                  setCriterioForm((prev) => ({
                    ...prev,
                    qtd_sessoes_consecutivas: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Se atingir critério, ir para:</Label>
              <Select
                value={criterioForm.fase_se_atingir || "NENHUMA"}
                onValueChange={(v) =>
                  setCriterioForm((prev) => ({
                    ...prev,
                    fase_se_atingir: v === "NENHUMA" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Concluída (nenhuma)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NENHUMA">Concluída (nenhuma)</SelectItem>
                  {FASES_ORDEM.filter((f) => f !== faseCriterio).map((f) => (
                    <SelectItem key={f} value={f}>
                      {FASE_LABELS[f]?.label || f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Se NÃO atingir critério, ir para:</Label>
              <Select
                value={criterioForm.fase_se_nao_atingir || "NENHUMA"}
                onValueChange={(v) =>
                  setCriterioForm((prev) => ({
                    ...prev,
                    fase_se_nao_atingir: v === "NENHUMA" ? "" : v,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Permanecer na fase atual" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NENHUMA">Permanecer na fase atual</SelectItem>
                  {FASES_ORDEM.filter((f) => f !== faseCriterio).map((f) => (
                    <SelectItem key={f} value={f}>
                      {FASE_LABELS[f]?.label || f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCriteriosAberto(false)}
            >
              Cancelar
            </Button>
            <Button onClick={salvarCriterios} disabled={salvandoCriterio}>
              {salvandoCriterio ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              Salvar Critérios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

export default function EvolucaoPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'evolucao', action: 'VIEW' }}>
      <EvolucaoPageContent />
    </ProtectedRoute>
  )
}
