"use client";

// Topbar do design v2 (Módulo 28): logo, busca em pílula e os botões redondos
// de alternar sidebar, tema e notificações.
//
// A busca é só visual por enquanto — no v2 ela filtra a clínica inteira, e
// isso é funcionalidade, não design. Fica desabilitada com o rótulo certo em
// vez de prometer um comportamento que não existe aqui.

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Bell, Moon, PanelLeft, Sun } from "lucide-react";
import { IconButton, SearchField } from "@/components/kit";
import { useFilial } from "@/hooks/useFilial";

function BotaoTema() {
  const { resolvedTheme, setTheme } = useTheme();
  // O tema só é conhecido no cliente; antes disso o ícone sairia errado e o
  // React reclamaria de hidratação divergente
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const noite = resolvedTheme === "dark";
  return (
    <IconButton
      aria-label={noite ? "Usar modo claro" : "Usar modo noite"}
      title={noite ? "Modo claro" : "Modo noite"}
      onClick={() => setTheme(noite ? "light" : "dark")}
    >
      {montado && noite ? <Moon aria-hidden /> : <Sun aria-hidden />}
    </IconButton>
  );
}

function FilialAtivaBadge() {
  const { filialAtiva, loading } = useFilial();
  if (loading || !filialAtiva) return null;
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-rim bg-surface/80 px-3 py-1.5 text-[0.8rem] font-medium text-ink-2 xl:inline-flex">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: filialAtiva.cor ?? "var(--brand)" }}
        aria-hidden
      />
      {filialAtiva.nome}
    </span>
  );
}

export function TopbarV2({
  onAlternarMenu,
  onAlternarRecolhida,
  recolhida,
}: {
  onAlternarMenu?: () => void;
  onAlternarRecolhida?: () => void;
  recolhida?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onAlternarMenu}
        aria-label="Alternar menu"
        className="grid size-11 shrink-0 place-items-center rounded-full border border-rim bg-surface/85 text-ink-2 transition hover:text-brand focus-visible:ring-4 focus-visible:ring-brand-ring focus-visible:outline-none lg:hidden"
      >
        <PanelLeft className="size-[18px]" aria-hidden />
      </button>

      {/* Duas artes, como no v2: `dark:brightness-0 dark:invert` sobre a arte
          clara lavava o azul da marca — a versão noturna é um arquivo próprio,
          recuperado da captura do v2. */}
      <Link href="/dashboard" className="shrink-0">
        <Image
          src="/caleido_logox.png"
          alt="Caleidoscópio"
          width={192}
          height={110}
          className="h-14 w-auto object-contain dark:hidden"
          priority
        />
        <Image
          src="/caleido_logox_dark.png"
          alt="Caleidoscópio"
          width={192}
          height={110}
          className="hidden h-14 w-auto object-contain dark:block"
          priority
        />
      </Link>

      <div className="ml-auto flex items-center gap-2">
        <FilialAtivaBadge />
        <SearchField
          placeholder="Buscar na clínica"
          aria-label="Buscar na clínica"
          disabled
          className="hidden w-[280px] opacity-70 md:flex"
        />
        {/* Recolher a sidebar. No v2 fica entre a busca e o tema, e só a
            partir de `lg` — abaixo disso a sidebar já é gaveta. */}
        {onAlternarRecolhida && (
          <IconButton
            aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
            title={recolhida ? "Expandir menu" : "Recolher menu"}
            onClick={onAlternarRecolhida}
            className="hidden lg:grid"
          >
            <PanelLeft aria-hidden />
          </IconButton>
        )}
        <BotaoTema />
        <IconButton
          aria-label="Notificações"
          className="relative"
          marcador={
            <span
              className="absolute top-2.5 right-2.5 size-2 rounded-full bg-danger"
              aria-hidden
            />
          }
        >
          <Bell aria-hidden />
        </IconButton>
      </div>
    </header>
  );
}
