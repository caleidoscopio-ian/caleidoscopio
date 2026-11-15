"use client";

// Ficha de dados: seção e campo (Módulo 28).
//
// Anatomia conferida na tela de prontuário do v2:
//
//   SecaoInfo   chip de 28px (brand-soft) + título 0.95rem semibold
//               + régua hairline logo abaixo
//   CampoInfo   microetiqueta 0.72rem MAIÚSCULA em `ink-4`
//               + valor 0.95rem em `ink`
//
// A microetiqueta é a mesma do cabeçalho de tabela. É o que diferencia "rótulo
// de campo" de "texto de conteúdo" sem precisar de negrito nem de dois pesos
// concorrendo na mesma linha.
//
// Valor ausente entra como `—` em `ink-4`: "Não informado" repetido oito vezes
// numa ficha vira ruído, e o traço já diz a mesma coisa. Quem precisar da frase
// passa `vazio="Não informado"`.

import * as React from "react";
import { cn } from "@/lib/utils";

export function SecaoInfo({
  icone,
  titulo,
  acoes,
  className,
  children,
}: {
  icone?: React.ReactNode;
  titulo: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {icone && (
            <span
              className="grid size-7 shrink-0 place-items-center rounded-[0.6rem] bg-brand-soft text-brand [&_svg]:size-[15px]"
              aria-hidden
            >
              {icone}
            </span>
          )}
          <h3 className="truncate text-[0.95rem] font-semibold text-ink">{titulo}</h3>
        </div>
        {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
      </header>
      {children}
    </section>
  );
}

/** Grade de campos: 1 coluna no telefone, 2 no tablet, 3 no desktop. */
export function GradeCampos({
  colunas = 3,
  className,
  children,
}: {
  colunas?: 2 | 3;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-5 sm:grid-cols-2",
        colunas === 3 && "lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CampoInfo({
  rotulo,
  valor,
  vazio = "—",
  larguraTotal,
  className,
}: {
  rotulo: React.ReactNode;
  valor?: React.ReactNode;
  /** texto quando não há valor; o padrão é um traço */
  vazio?: React.ReactNode;
  /** ocupa a linha inteira (endereço, observação) */
  larguraTotal?: boolean;
  className?: string;
}) {
  const vazioDeFato =
    valor === null || valor === undefined || valor === "" || valor === false;
  return (
    <div
      className={cn(
        "min-w-0",
        larguraTotal && "sm:col-span-2 lg:col-span-3",
        className
      )}
    >
      <p className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
        {rotulo}
      </p>
      <p
        className={cn(
          "mt-1 text-[0.95rem] break-words",
          vazioDeFato ? "text-ink-4" : "text-ink"
        )}
      >
        {vazioDeFato ? vazio : valor}
      </p>
    </div>
  );
}

/* ── Estado vazio e carregando ────────────────────────────────────────────
   Repetem em quase toda tela e cada uma inventava o seu: ora um `Card` com
   texto cinza no meio, ora um `div.text-center.py-8`. Aqui é uma peça só —
   chip de 48px, título, uma linha de apoio e no máximo um botão. */

export function EstadoVazio({
  icone,
  titulo,
  texto,
  acao,
  noturno,
  className,
}: {
  icone?: React.ReactNode;
  titulo: string;
  texto?: React.ReactNode;
  acao?: React.ReactNode;
  /** dentro de `Panel variant="night"` */
  noturno?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-10 text-center",
        className
      )}
    >
      {icone && (
        <span
          className={cn(
            "grid size-12 place-items-center rounded-2xl [&_svg]:size-5",
            noturno ? "bg-white/10 text-white/70" : "bg-surface-sunken text-ink-3"
          )}
          aria-hidden
        >
          {icone}
        </span>
      )}
      <p
        className={cn(
          "mt-3 text-[0.95rem] font-semibold",
          noturno ? "text-white" : "text-ink"
        )}
      >
        {titulo}
      </p>
      {texto && (
        <p
          className={cn(
            "mt-1 max-w-md text-sm",
            noturno ? "text-white/60" : "text-ink-3"
          )}
        >
          {texto}
        </p>
      )}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

/** Espera com giro. Mesma caixa do estado vazio, para a tela não saltar
 *  quando o dado chega. */
export function Carregando({
  texto = "Carregando...",
  className,
}: {
  texto?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-10 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className="size-8 animate-spin rounded-full border-2 border-hairline border-t-brand" />
      <p className="mt-3 text-sm text-ink-3">{texto}</p>
    </div>
  );
}
