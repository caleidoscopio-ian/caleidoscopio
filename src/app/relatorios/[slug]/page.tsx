"use client";

// Casca única da Central de Relatórios (Módulo 25).
//
// Esta página renderiza QUALQUER relatório da central: o slug da URL resolve a
// definição no catálogo, que diz quais filtros existem, o que dá para agrupar e
// quais métricas somar. Relatório novo não precisa de página nova.
//
// Rotas estáticas vizinhas (/relatorios/profissionais) têm precedência sobre
// este segmento dinâmico no Next, então o relatório antigo continua intacto.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MainLayout } from "@/components/main-layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, Info } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { buscarDefinicao } from "@/lib/relatorios/definicoes";
import { corDoRelatorio, iconeDoRelatorio } from "@/components/relatorios/icones";
import { BarraFiltros, filtrosIniciais } from "@/components/relatorios/barra-filtros";
import { SeletorAgrupamento } from "@/components/relatorios/seletor-agrupamento";
import { TabelaAgrupada } from "@/components/relatorios/tabela-agrupada";
import { formatarMetrica } from "@/lib/relatorios/formatacao";
import { BotoesExportacao } from "@/components/relatorios/botoes-exportacao";
import { PreferenciasRelatorioPainel } from "@/components/relatorios/preferencias-relatorio";
// O recharts pesa ~130 kB e só serve quando há gráfico na tela. Carregado sob
// demanda, quem abre o relatório com o gráfico desligado não paga por ele.
const GraficoRelatorio = dynamic(
  () => import("@/components/relatorios/grafico-relatorio").then((m) => m.GraficoRelatorio),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full" /> }
);
import { usePreferenciasRelatorio } from "@/hooks/usePreferenciasRelatorio";
import type { ContextoExportacao } from "@/lib/relatorios/exportacao";
import { format } from "date-fns";
import type { FiltrosRelatorio, OpcoesRelatorio, ResultadoRelatorio } from "@/types/relatorio";

/** Data para a query string: só o dia. A API resolve o fuso da clínica
 *  (parseInicioPeriodo / parseFimPeriodo), que é o certo — montar hora aqui
 *  reintroduziria o bug de fuso já corrigido. */
const soData = (d: Date) => format(d, "yyyy-MM-dd");

function Conteudo() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params?.slug ?? "";

  const definicao = useMemo(() => buscarDefinicao(slug), [slug]);

  const [opcoes, setOpcoes] = useState<OpcoesRelatorio | null>(null);
  const [resultado, setResultado] = useState<ResultadoRelatorio | null>(null);
  const [filtros, setFiltros] = useState<FiltrosRelatorio>(filtrosIniciais);

  // Agrupamento, colunas e gráfico ficam nas preferências do usuário (Fase 5),
  // salvas por relatório. O agrupamento mora lá porque é o que a pessoa mais
  // quer encontrar como deixou.
  const { preferencias, carregado: prefsCarregadas, salvar, restaurarPadrao, ehPadrao } =
    usePreferenciasRelatorio(definicao);
  const agrupamento = preferencias.agrupamento;
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Relatório que mora fora da central: o catálogo só indexa, a página redireciona
  useEffect(() => {
    if (definicao?.hrefExterno) router.replace(definicao.hrefExterno);
  }, [definicao, router]);

  useEffect(() => {
    if (!user || !definicao || definicao.hrefExterno) return;
    let cancelado = false;
    apiGet("/api/relatorios/opcoes")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelado && j?.success) setOpcoes(j.data as OpcoesRelatorio);
      })
      .catch(() => {
        /* a barra funciona sem as listas; o período já basta para consultar */
      });
    return () => {
      cancelado = true;
    };
  }, [user, definicao]);

  const consultar = useCallback(
    async (f: FiltrosRelatorio, niveis: string[]) => {
      if (!definicao || definicao.hrefExterno) return;
      setLoading(true);
      setErro(null);
      try {
        const qs = new URLSearchParams({
          dataInicio: soData(f.dataInicio),
          dataFim: soData(f.dataFim),
          agrupar: niveis.join(","),
        });
        if (f.filialId) qs.set("filialId", f.filialId);
        if (f.profissionalId) qs.set("profissionalId", f.profissionalId);
        if (f.convenioId) qs.set("convenioId", f.convenioId);
        if (f.especialidade) qs.set("especialidade", f.especialidade);
        if (f.procedimentoId) qs.set("procedimentoId", f.procedimentoId);

        const resposta = await apiGet(`/api/relatorios/${definicao.slug}?${qs.toString()}`);
        const json = await resposta.json();
        if (!json?.success) {
          setErro(json?.error ?? "Não foi possível carregar o relatório.");
          setResultado(null);
          return;
        }
        const dados = json.data as ResultadoRelatorio;
        setResultado(dados);
        // A API devolve o agrupamento normalizado, e a tabela e o gráfico leem
        // dele — não daqui. Não escrevemos de volta na preferência de propósito:
        // isso disparia o efeito e uma segunda consulta. As duas listas não
        // divergem porque `sanear` no hook já remove repetição, dimensão morta e
        // o que passa de 3 níveis antes de a requisição sair.
      } catch {
        setErro("Falha de comunicação com o servidor. Tente novamente.");
        setResultado(null);
      } finally {
        setLoading(false);
      }
    },
    [definicao]
  );

  // Primeira carga e recarga ao mudar o agrupamento. Espera as preferências
  // para não consultar duas vezes (uma com o padrão, outra com o salvo).
  useEffect(() => {
    if (!user || !definicao || definicao.hrefExterno || !prefsCarregadas) return;
    consultar(filtros, agrupamento);
    // `filtros` fora das dependências de propósito: digitar no filtro não
    // dispara consulta — só o botão Aplicar dispara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, definicao, agrupamento, consultar, prefsCarregadas]);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Relatórios", href: "/relatorios" },
    { label: definicao?.titulo ?? "Relatório" },
  ];

  if (!definicao) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Relatório não encontrado</h1>
          <p className="text-muted-foreground">
            O endereço <code className="rounded bg-muted px-1.5 py-0.5">{slug}</code> não
            corresponde a nenhum relatório do catálogo.
          </p>
          <Button asChild variant="outline">
            <Link href="/relatorios">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à central
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (definicao.hrefExterno) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <Skeleton className="h-32 w-full" />
      </MainLayout>
    );
  }

  if (!definicao.disponivel) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{definicao.titulo}</h1>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {definicao.motivoIndisponivel ?? "Este relatório ainda não está disponível."}
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline">
            <Link href="/relatorios">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à central
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const Icone = iconeDoRelatorio(definicao.icone);
  const cor = corDoRelatorio(definicao.cor);
  const metricasDestaque = definicao.metricas.filter((m) => preferencias.colunas.includes(m.chave));

  // A exportação sai do resultado que está na tela, não de uma nova consulta:
  // assim o arquivo e a tela não podem divergir.
  const contextoExportacao: ContextoExportacao | null = resultado
    ? {
        titulo: definicao.titulo,
        periodo: resultado.periodo,
        agrupamento: resultado.agrupamento,
        dimensoes: definicao.dimensoes,
        // Exporta o que está visível: o arquivo não deve ter coluna que a
        // pessoa escondeu, nem faltar coluna que ela ligou.
        metricas: definicao.metricas.map((m) => ({
          ...m,
          padrao: preferencias.colunas.includes(m.chave),
        })),
        colunasDetalhe: definicao.colunasDetalhe,
        grupos: resultado.grupos,
        total: resultado.total,
        clinica: user?.tenant?.name ?? null,
        // Rótulos legíveis, não ids: o PDF é impresso e circula fora da tela,
        // então precisa dizer de que recorte veio.
        filtros: [
          {
            rotulo: "Filial",
            valor: opcoes?.filiais.find((f) => f.id === filtros.filialId)?.nome ?? "",
          },
          {
            rotulo: "Profissional",
            valor:
              opcoes?.profissionais.find((p) => p.id === filtros.profissionalId)?.nome ?? "",
          },
          { rotulo: "Especialidade", valor: filtros.especialidade ?? "" },
          {
            rotulo: "Parceiro",
            valor:
              filtros.convenioId === "particular"
                ? "Particular"
                : (opcoes?.convenios.find((c) => c.id === filtros.convenioId)?.nome ?? ""),
          },
          {
            rotulo: "Procedimento",
            valor:
              opcoes?.procedimentos.find((p) => p.id === filtros.procedimentoId)?.nome ?? "",
          },
        ].filter((f) => f.valor),
      }
    : null;

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2.5 ${cor.fundo} ${cor.texto}`}>
            <Icone className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{definicao.titulo}</h1>
            <p className="text-sm text-muted-foreground">{definicao.descricao}</p>
          </div>
          {contextoExportacao && (
            <BotoesExportacao contexto={contextoExportacao} desabilitado={loading} />
          )}
        </div>

        <BarraFiltros
          definicao={definicao}
          opcoes={opcoes}
          loading={loading}
          onFiltrar={(f) => {
            setFiltros(f);
            consultar(f, agrupamento);
          }}
        />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <SeletorAgrupamento
            dimensoes={definicao.dimensoes}
            valor={agrupamento}
            onChange={(niveis) => salvar({ agrupamento: niveis })}
            desabilitado={loading}
          />
          <PreferenciasRelatorioPainel
            definicao={definicao}
            preferencias={preferencias}
            onAlterar={salvar}
            onRestaurar={restaurarPadrao}
            ehPadrao={ehPadrao}
          />
        </div>

        {erro && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {resultado?.avisos?.map((a, i) => (
          <Alert key={i}>
            <Info className="h-4 w-4" />
            <AlertDescription>{a}</AlertDescription>
          </Alert>
        ))}

        {loading && !resultado && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metricasDestaque.map((m) => (
                <Skeleton key={m.chave} className="h-20" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {resultado && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metricasDestaque.map((m) => (
                <div key={m.chave} className="rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{m.rotulo}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatarMetrica(resultado.total.metricas[m.chave], m.tipo)}
                  </p>
                  {resultado.total.semValor[m.chave] ? (
                    <p className="mt-1 text-[11px] text-amber-600">
                      {resultado.total.semValor[m.chave]} sem valor cadastrado
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {preferencias.grafico !== "nenhum" && (
              <GraficoRelatorio
                grupos={resultado.grupos}
                agrupamento={resultado.agrupamento}
                dimensoes={definicao.dimensoes}
                metricas={definicao.metricas}
                colunas={preferencias.colunas}
                tipo={preferencias.grafico}
              />
            )}

            <TabelaAgrupada
              grupos={resultado.grupos}
              total={resultado.total}
              metricas={definicao.metricas.map((m) => ({
                ...m,
                padrao: preferencias.colunas.includes(m.chave),
              }))}
              dimensoes={definicao.dimensoes}
              agrupamento={resultado.agrupamento}
              colunasDetalhe={definicao.colunasDetalhe}
              contextoExportacao={contextoExportacao}
            />
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default function RelatorioPage() {
  // O recurso RBAC vem do catálogo — cada relatório declara o seu.
  // Aqui não há acesso ao slug antes do render, então a casca protege com o
  // recurso `relatorios` e a rota de API revalida a permissão específica.
  return (
    <ProtectedRoute requiredPermission={{ resource: "relatorios", action: "VIEW" }}>
      <Conteudo />
    </ProtectedRoute>
  );
}
