"use client";

// Cabeçalho de página do v2 (Módulo 28).
//
// Anatomia conferida no clone navegável (design/README.md):
//
//   header  flex flex-col gap-4 md:flex-row md:items-end md:justify-between
//     div   min-w-0 space-y-1.5
//       nav  Trilha
//       h1   text-[2rem] leading-[1.1] font-semibold md:text-[2.375rem]
//       p    text-[0.95rem] text-ink-3
//     div   flex flex-wrap items-center gap-2.5      ← ações, botão tamanho lg
//
// `md:items-end` (e não `items-start`) é o que alinha o botão principal pela
// base do título em vez de pelo topo — some com os 8px de desalinho que
// apareciam em toda tela.
//
// Além da forma de listagem, atende a forma de **tela de detalhe**, que era
// onde cada página inventava a sua:
//
//   voltar   pílula "← Voltar" **na linha da trilha**, antes das migalhas —
//            é onde o v2 põe, e assim a seta não empurra o título nem o avatar
//   meta     linha de badges sob o título — status, vínculo, código, CNPJ
//   avatar   peça sem moldura: avatar de pessoa, chip na cor do procedimento

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Trilha, useTrilha, type Migalha } from "./trilha";

/** Pílula de voltar: mesma anatomia do `ActionButton` secundário em `sm`. */
const ESTILO_VOLTAR =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-rim " +
  "bg-surface/85 px-3 text-[0.8rem] font-medium text-ink-2 " +
  "shadow-[0_1px_2px_rgba(15,27,61,0.06)] transition hover:bg-surface hover:text-ink " +
  "focus-visible:ring-4 focus-visible:ring-brand-ring focus-visible:outline-none";

export function PageHeader({
  titulo,
  subtitulo,
  meta,
  acoes,
  voltar,
  icone,
  avatar,
  migalhas,
  semTrilha,
  className,
}: {
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  /** Linha de badges logo abaixo do título. */
  meta?: React.ReactNode;
  acoes?: React.ReactNode;
  /** Seta de voltar à esquerda do título: `href` navega, `onClick` decide. */
  voltar?: { href?: string; onClick?: () => void; rotulo?: string };
  /** Ícone em chip `brand-soft`, à esquerda — para a tela com identidade
   *  própria (Central de Relatórios, Evolução). */
  icone?: React.ReactNode;
  /** Peça visual à esquerda, **sem** moldura: avatar de pessoa, chip na cor do
   *  procedimento, logotipo do convênio. Tem precedência sobre `icone`, que
   *  imporia o fundo da marca sobre uma cor que é dado, não decoração. */
  avatar?: React.ReactNode;
  /** Sobrescreve a trilha derivada da rota. */
  migalhas?: Migalha[];
  /** Esconde a trilha. Só para tela que não tem pai (dashboard, login). */
  semTrilha?: boolean;
  className?: string;
}) {
  const rotulo = voltar?.rotulo ?? "Voltar";
  const trilha = useTrilha(migalhas);

  return (
    <header
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        {/* Linha da trilha: ocupa a largura toda e começa na margem — no v2 o
            avatar fica ao lado do título, não ao lado das migalhas. */}
        {(voltar || !semTrilha) && (
          <div className="flex flex-wrap items-center gap-2.5">
            {voltar &&
              (voltar.href ? (
                <Link href={voltar.href} className={ESTILO_VOLTAR}>
                  <ArrowLeft className="size-4" aria-hidden />
                  {rotulo}
                </Link>
              ) : (
                <button type="button" onClick={voltar.onClick} className={ESTILO_VOLTAR}>
                  <ArrowLeft className="size-4" aria-hidden />
                  {rotulo}
                </button>
              ))}
            {!semTrilha && <Trilha migalhas={trilha} />}
          </div>
        )}

        <div className="flex min-w-0 items-center gap-3">
          {avatar ? (
            <span className="shrink-0">{avatar}</span>
          ) : (
            icone && (
              <span className="grid size-11 shrink-0 place-items-center rounded-[0.95rem] bg-brand-soft text-brand [&_svg]:size-[21px]">
                {icone}
              </span>
            )
          )}

          <div className="min-w-0 space-y-1">
            <h1 className="text-[2rem] leading-[1.1] font-semibold text-ink md:text-[2.375rem]">
              {titulo}
            </h1>
            {subtitulo && <p className="text-[0.95rem] text-ink-3">{subtitulo}</p>}
            {meta && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">{meta}</div>
            )}
          </div>
        </div>
      </div>

      {acoes && (
        <div className="flex flex-wrap items-center gap-2.5 md:shrink-0">{acoes}</div>
      )}
    </header>
  );
}
