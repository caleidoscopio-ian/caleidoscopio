"use client";

// Índice da Central de Relatórios (Módulo 25).
//
// A lista NÃO é escrita aqui: vem de `@/lib/relatorios/definicoes`. Antes esta
// página tinha quatro cards fixos, três deles "em breve" apontando para nada.
// Agora acrescentar relatório é acrescentar entrada no catálogo.
//
// Cada card respeita o recurso RBAC que o próprio relatório declara — quem não
// pode ver o mapa de salas não vê o cartão do mapa de salas.

import Link from "next/link";
import { MainLayout } from "@/components/main-layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BarChart3, ExternalLink } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { RELATORIOS_ORDENADOS, type DefinicaoRelatorio } from "@/lib/relatorios/definicoes";
import { corDoRelatorio, iconeDoRelatorio } from "@/components/relatorios/icones";

function CentralContent() {
  const { can, loading } = usePermissions();

  const breadcrumbs = [{ label: "Dashboard", href: "/dashboard" }, { label: "Relatórios" }];

  const visiveis = RELATORIOS_ORDENADOS.filter((r) => can(r.recurso, "VIEW"));
  const prontos = visiveis.filter((r) => r.disponivel);
  const emConstrucao = visiveis.filter((r) => !r.disponivel);

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <BarChart3 className="h-8 w-8 text-primary" />
            Central de Relatórios
          </h1>
          <p className="text-muted-foreground">
            Escolha um relatório. Dentro dele, o período, os filtros e o agrupamento em até três
            níveis ficam na mesma barra.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              {prontos.map((r) => (
                <CartaoRelatorio key={r.slug} definicao={r} />
              ))}
            </div>

            {emConstrucao.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">Em construção</h2>
                <div className="grid gap-5 md:grid-cols-2">
                  {emConstrucao.map((r) => (
                    <CartaoRelatorio key={r.slug} definicao={r} />
                  ))}
                </div>
              </div>
            )}

            {visiveis.length === 0 && (
              <div className="rounded-lg border bg-card p-10 text-center">
                <p className="text-sm font-medium">Nenhum relatório disponível para o seu perfil</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  O acesso aos relatórios é configurado em Gestão de Permissões.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

function CartaoRelatorio({ definicao }: { definicao: DefinicaoRelatorio }) {
  const Icone = iconeDoRelatorio(definicao.icone);
  const cor = corDoRelatorio(definicao.cor);
  const externo = !!definicao.hrefExterno;
  const href = definicao.hrefExterno ?? `/relatorios/${definicao.slug}`;

  const conteudo = (
    <Card
      className={
        definicao.disponivel
          ? "relative h-full overflow-hidden transition-all hover:border-primary hover:shadow-lg"
          : "relative h-full overflow-hidden opacity-70"
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className={`rounded-lg p-3 ${cor.fundo} ${cor.texto}`}>
            <Icone className="h-6 w-6" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {!definicao.disponivel && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                Em breve
              </Badge>
            )}
            {externo && definicao.disponivel && (
              <Badge variant="secondary" className="font-normal">
                <ExternalLink className="mr-1 h-3 w-3" />
                Tela própria
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="mt-4 text-lg">{definicao.titulo}</CardTitle>
        <CardDescription>{definicao.descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {definicao.disponivel ? (
          <Button variant="default" className="w-full">
            Abrir relatório
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <div className="space-y-2">
            <Button variant="outline" className="w-full" disabled>
              Em desenvolvimento
            </Button>
            {definicao.motivoIndisponivel && (
              <p className="text-center text-xs text-muted-foreground">
                {definicao.motivoIndisponivel}
              </p>
            )}
          </div>
        )}
      </CardContent>
      {definicao.disponivel && (
        <div
          className={`pointer-events-none absolute -mr-16 -mt-16 right-0 top-0 h-32 w-32 rounded-full opacity-20 ${cor.fundo}`}
        />
      )}
    </Card>
  );

  if (!definicao.disponivel) return conteudo;

  return (
    <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      {conteudo}
    </Link>
  );
}

export default function RelatoriosPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: "relatorios", action: "VIEW" }}>
      <CentralContent />
    </ProtectedRoute>
  );
}
