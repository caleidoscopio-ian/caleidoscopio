"use client";

// Avatar de pessoa, campo de busca e seletor segmentado (Módulo 28).

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarcadorDeslizante } from "./movimento";

/* ── PersonAvatar ─────────────────────────────────────────────────────────
   Seis gradientes em ordem fixa, escolhidos por hash do nome: a mesma pessoa
   tem sempre a mesma cor, em qualquer tela, sem guardar nada. */

const GRADIENTES = [
  "from-[#8fb0ff] to-[#5b7cf5]",
  "from-[#9ee0c6] to-[#3fb68b]",
  "from-[#ffc6a8] to-[#f08a4b]",
  "from-[#c9b8ff] to-[#8b6cf0]",
  "from-[#9fe3f2] to-[#25a9c8]",
  "from-[#ffb8c9] to-[#e8577a]",
] as const;

function indiceDoNome(nome: string): number {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return h % GRADIENTES.length;
}

export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function PersonAvatar({
  nome,
  tamanho = 40,
  className,
}: {
  nome: string;
  tamanho?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-semibold text-white",
        "ring-2 ring-surface shadow-[0_2px_8px_rgba(15,27,61,0.14)]",
        GRADIENTES[indiceDoNome(nome)],
        className
      )}
      style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.36) }}
      title={nome}
      aria-hidden
    >
      {iniciaisDe(nome)}
    </span>
  );
}

/* ── SearchField ─────────────────────────────────────────────────────────── */

export function SearchField({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2 rounded-full border border-rim bg-surface/80 px-4",
        "shadow-[0_1px_2px_rgba(15,27,61,0.04)] transition",
        "focus-within:border-brand/40 focus-within:ring-4 focus-within:ring-brand-ring",
        className
      )}
    >
      <Search className="size-[17px] shrink-0 text-ink-3" aria-hidden />
      <input
        type="search"
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-sutil"
        {...props}
      />
    </div>
  );
}

/* ── Segmented ───────────────────────────────────────────────────────────
   Trilho em `surface-sunken`, opção ativa num marcador branco que **desliza**
   entre as opções (`MarcadorDeslizante`, mola 380/32) — como no v2. Pintar o
   fundo em cada botão fazia o destaque pular de posição.

   O `layoutId` leva `React.useId()` porque a mesma tela costuma ter mais de um
   segmentado (período e visão, por exemplo) e os marcadores não devem se
   enxergar. */

export function Segmented<T extends string>({
  opcoes,
  valor,
  onChange,
  className,
}: {
  /** `icone` é opcional: as abas do v2 (Agenda Geral / Grade) têm ícone, o
   *  seletor de período (Dia / Semana / Mês) não. */
  opcoes: { valor: T; rotulo: string; icone?: React.ReactNode }[];
  valor: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const idMarcador = `segmentado-${React.useId()}`;
  return (
    <div
      role="tablist"
      className={cn("inline-flex gap-0.5 rounded-full bg-surface-sunken p-1", className)}
    >
      {opcoes.map((o) => {
        const ativa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => onChange(o.valor)}
            className={cn(
              "relative h-8 rounded-full px-3.5 text-[0.8rem] font-medium whitespace-nowrap",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring",
              ativa ? "text-ink" : "text-ink-3 hover:text-ink"
            )}
          >
            {ativa && (
              <MarcadorDeslizante
                id={idMarcador}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgba(15,27,61,0.12)]"
              />
            )}
            <span className="relative flex items-center gap-1.5 [&_svg]:size-4">
              {o.icone}
              {o.rotulo}
            </span>
          </button>
        );
      })}
    </div>
  );
}
