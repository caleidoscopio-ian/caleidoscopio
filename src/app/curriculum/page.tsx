/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  BookOpen,
  Edit,
  Layers,
  ListChecks,
  Plus,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { VisualizarCurriculumDialog } from "@/components/curriculum/visualizar-curriculum-dialog";
import { ExcluirCurriculumDialog } from "@/components/curriculum/excluir-curriculum-dialog";
import { AtribuirCurriculumDialog } from "@/components/curriculum/atribuir-curriculum-dialog";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  ActionButton,
  Carregando,
  EstadoVazio,
  PageHeader,
  Panel,
  SearchField,
  StatCard,
  StatusPill,
} from "@/components/kit";

interface Curriculum {
  id: string;
  nome: string;
  descricao?: string;
  observacao?: string;
  createdAt: string;
  atividades: Array<{
    id: string;
    ordem: number;
    atividade: {
      id: string;
      nome: string;
    };
  }>;
  _count?: {
    atividades: number;
  };
}

function CurriculumPageContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Plano Terapêutico" },
  ];

  const fetchCurriculums = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/curriculum", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar planos terapêuticos");
      }

      if (result.success) {
        setCurriculums(result.data);
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Erro ao buscar planos terapêuticos:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar planos terapêuticos"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCurriculums();
    }
  }, [isAuthenticated, user]);

  const filteredCurriculums = curriculums.filter(
    (curriculum) =>
      curriculum.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (curriculum.descricao &&
        curriculum.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const totalAtividades = curriculums.reduce((acc, c) => acc + (c._count?.atividades || 0), 0);
  const mediaAtividades = curriculums.length > 0 ? Math.round(totalAtividades / curriculums.length) : 0;

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-7">
        <PageHeader
          titulo="Plano Terapêutico"
          subtitulo="Gerencie conjuntos de atividades organizadas"
          acoes={
            <ActionButton onClick={() => router.push("/curriculum/novo")}>
              <Plus />
              Novo Plano Terapêutico
            </ActionButton>
          }
        />

        <div className="anim-escalonada grid gap-4 sm:grid-cols-3 xl:grid-cols-[1.25fr_1fr_1fr]">
          <StatCard
            tom="blue"
            size="hero"
            icone={<BookOpen />}
            rotulo="Total de Planos"
            valor={loading ? "..." : curriculums.length}
            hint="Planos cadastrados"
          />
          <StatCard
            tom="lavender"
            icone={<ListChecks />}
            rotulo="Total de Atividades"
            valor={loading ? "..." : totalAtividades}
            hint="Somando todos os planos"
          />
          <StatCard
            tom="mint"
            icone={<BarChart3 />}
            rotulo="Média de Atividades"
            valor={loading ? "..." : mediaAtividades}
            hint="Por plano terapêutico"
          />
        </div>

        <Panel
          icone={<Layers />}
          titulo={
            <span className="inline-flex items-center gap-2">
              Lista de Planos Terapêuticos
              {!loading && (
                <span className="tabular rounded-full bg-surface-sunken px-2 py-0.5 text-[0.72rem] font-medium text-ink-3">
                  {filteredCurriculums.length} de {curriculums.length}
                </span>
              )}
            </span>
          }
          subtitulo="Planos Terapêuticos cadastrados na clínica"
          acoes={
            <SearchField
              placeholder="Buscar por nome ou descrição..."
              aria-label="Buscar planos terapêuticos"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72"
            />
          }
        >
          {error ? (
            <EstadoVazio
              icone={<BookOpen />}
              titulo="Erro ao carregar planos"
              texto={error}
              acao={
                <ActionButton variant="secondary" size="sm" onClick={fetchCurriculums}>
                  Tentar Novamente
                </ActionButton>
              }
            />
          ) : loading ? (
            <Carregando texto="Carregando planos..." />
          ) : curriculums.length === 0 ? (
            <EstadoVazio
              icone={<BookOpen />}
              titulo="Nenhum plano terapêutico encontrado"
              texto="Comece criando o primeiro plano terapêutico."
              acao={
                <ActionButton size="sm" onClick={() => router.push("/curriculum/novo")}>
                  <Plus />
                  Novo Plano Terapêutico
                </ActionButton>
              }
            />
          ) : filteredCurriculums.length === 0 ? (
            <EstadoVazio
              icone={<Search />}
              titulo="Nenhum resultado encontrado"
              texto="Tente ajustar os termos da sua busca."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  <TableHead>Atividades</TableHead>
                  <TableHead className="hidden md:table-cell">Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCurriculums.map((curriculum) => (
                  <TableRow key={curriculum.id}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                          <BookOpen className="size-4" />
                        </span>
                        <span className="font-semibold text-ink">{curriculum.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-md md:table-cell">
                      {curriculum.descricao ? (
                        <span className="line-clamp-2 text-sm text-ink-3">{curriculum.descricao}</span>
                      ) : (
                        <span className="text-ink-4">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusPill tom="info">
                        {curriculum._count?.atividades || 0} atividades
                      </StatusPill>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="tabular text-[0.82rem] text-ink-3">{formatDate(curriculum.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-nowrap items-center justify-end gap-1.5">
                        <VisualizarCurriculumDialog curriculum={curriculum} />
                        <AtribuirCurriculumDialog curriculum={curriculum} onSuccess={fetchCurriculums} />
                        <button
                          type="button"
                          aria-label={`Editar ${curriculum.nome}`}
                          title="Editar"
                          onClick={() => router.push(`/curriculum/editar/${curriculum.id}`)}
                          className="grid size-9 place-items-center rounded-full bg-surface text-ink-2 shadow-[0_1px_2px_rgba(15,27,61,0.06)] transition hover:text-brand focus-visible:ring-4 focus-visible:ring-brand-ring focus-visible:outline-none"
                        >
                          <Edit className="size-4" />
                        </button>
                        <ExcluirCurriculumDialog curriculum={curriculum} onSuccess={fetchCurriculums} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
    </MainLayout>
  );
}

export default function CurriculumPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'curriculums', action: 'VIEW' }}>
      <CurriculumPageContent />
    </ProtectedRoute>
  );
}
