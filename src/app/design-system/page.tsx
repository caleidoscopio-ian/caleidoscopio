"use client";

// Guia visual do design v2 (Módulo 28).
//
// Serve a dois propósitos: conferir o porte contra as capturas do v2 sem
// precisar de login, e dar à equipe um lugar onde ver cada peça do kit isolada.
//
// Não tem dado real nem chamada de API — é só aparência. Por isso fica fora do
// `ProtectedRoute` e do `MainLayout`.

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CascaV2 } from "@/components/shell/casca";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Moon,
  Play,
  Sun,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  ActionButton,
  IconButton,
  IconTile,
  PageHeader,
  Panel,
  PersonAvatar,
  SearchField,
  Segmented,
  StatCard,
  StatusPill,
  type TomStatus,
} from "@/components/kit";

const SUPERFICIES = [
  "canvas",
  "panel",
  "surface",
  "surface-muted",
  "surface-sunken",
  "popover",
  "rim",
  "hairline",
] as const;

const TINTAS = ["ink", "ink-2", "ink-3", "ink-4", "ink-sutil"] as const;
const MARCA = ["brand", "brand-strong", "brand-soft", "brand-ring"] as const;
const STATUS = ["success", "warning", "danger", "info", "violet"] as const;

const PAPEIS_TIPO = [
  { nome: "display-hero", classe: "text-[5.25rem] leading-none font-bold tracking-[-0.04em]", exemplo: "48" },
  { nome: "display-kpi", classe: "text-[3.25rem] leading-none font-bold tracking-[-0.04em]", exemplo: "56" },
  { nome: "heading-page", classe: "text-[2.375rem] leading-[1.1] font-semibold tracking-[-0.022em]", exemplo: "Dashboard" },
  { nome: "heading-panel", classe: "text-[1.3rem] leading-[1.25] font-semibold tracking-[-0.022em]", exemplo: "Agenda de Hoje" },
  { nome: "title-time", classe: "text-[1.25rem] leading-none font-semibold", exemplo: "11:00" },
  { nome: "title-sm", classe: "text-[1.05rem] font-semibold", exemplo: "Arthur Almeida Teixeira" },
  { nome: "body", classe: "text-base", exemplo: "Texto base da interface" },
  { nome: "label-lg", classe: "text-[0.95rem] font-medium", exemplo: "Total de Pacientes" },
  { nome: "nav", classe: "text-[0.9rem] font-medium", exemplo: "Pacientes" },
  { nome: "body-sm", classe: "text-sm", exemplo: "Seus agendamentos para hoje" },
  { nome: "caption-lg", classe: "text-[0.8rem]", exemplo: "Na clínica" },
  { nome: "caption", classe: "text-xs", exemplo: "Ana Queiroz Teixeira · Sala 04" },
  { nome: "pill", classe: "text-[0.72rem] font-medium", exemplo: "Em atendimento" },
  { nome: "micro", classe: "text-[0.7rem]", exemplo: "50 min" },
  { nome: "overline", classe: "text-[0.66rem] font-semibold uppercase tracking-[0.08em]", exemplo: "Atendimento" },
];

const AGENDA = [
  { hora: "11:00", nome: "Joaquim Esteves Holanda", prof: "Ana Queiroz Teixeira", sala: "Sala 04" },
  { hora: "11:00", nome: "Valentina Duarte Moreira", prof: "Beatriz Holanda Ribeiro", sala: "Sala 05" },
  { hora: "11:00", nome: "Bernardo Barbosa Teixeira", prof: "Carla Almeida Cardoso", sala: "Sala 10" },
];

function Amostra({ token, rotulo }: { token: string; rotulo: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="size-9 shrink-0 rounded-xl border border-hairline"
        style={{ backgroundColor: `var(--${token})` }}
      />
      <span className="min-w-0">
        <span className="block truncate text-[0.8rem] font-medium text-ink">{rotulo}</span>
        <span className="block truncate text-[0.7rem] text-ink-3">--{token}</span>
      </span>
    </div>
  );
}

export default function DesignSystemPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [aba, setAba] = useState<"proximos" | "todos">("proximos");
  const [passo, setPasso] = useState<"dia" | "semana" | "mes">("semana");
  // O tema só existe no cliente: ler `resolvedTheme` durante o SSR deixaria o
  // rótulo do botão diferente do que o servidor renderizou
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const noite = montado && resolvedTheme === "dark";

  // A casca é a de verdade (`CascaV2`), não uma cópia: é o que permite
  // conferir sidebar, topbar e o container de 1480px sem o Sistema 1 no ar.
  return (
    <SidebarProvider>
      <CascaV2>
        <>
          <PageHeader
            semTrilha
            titulo="Design System"
            subtitulo="Caleidoscópio v2 — tokens, tipografia e kit. Compare com as capturas em design/."
            acoes={
              <ActionButton onClick={() => setTheme(noite ? "light" : "dark")}>
                {noite ? <Sun /> : <Moon />}
                {noite ? "Modo claro" : "Modo noite"}
              </ActionButton>
            }
          />

          {/* ── Cores ── */}
          <Panel titulo="Cores" subtitulo="Todo valor vem de token" icone={<ClipboardList />}>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-[0.66rem] font-semibold tracking-[0.08em] text-ink-sutil uppercase">
                  Superfícies
                </p>
                {SUPERFICIES.map((t) => (
                  <Amostra key={t} token={t} rotulo={t} />
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[0.66rem] font-semibold tracking-[0.08em] text-ink-sutil uppercase">
                  Tinta
                </p>
                {TINTAS.map((t) => (
                  <Amostra key={t} token={t} rotulo={t} />
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[0.66rem] font-semibold tracking-[0.08em] text-ink-sutil uppercase">
                  Marca
                </p>
                {MARCA.map((t) => (
                  <Amostra key={t} token={t} rotulo={t} />
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[0.66rem] font-semibold tracking-[0.08em] text-ink-sutil uppercase">
                  Status
                </p>
                {STATUS.map((t) => (
                  <Amostra key={t} token={t} rotulo={t} />
                ))}
              </div>
            </div>
          </Panel>

          {/* ── Tipografia ── */}
          <Panel
            titulo="Tipografia"
            subtitulo="17 papéis, pilha de fontes do sistema, sem webfont"
            icone={<ClipboardList />}
          >
            <ul className="divide-y divide-hairline">
              {PAPEIS_TIPO.map((p) => (
                <li key={p.nome} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-3">
                  <code className="w-36 shrink-0 text-xs text-ink-3">{p.nome}</code>
                  <span className={`${p.classe} text-ink`}>{p.exemplo}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* ── KPIs ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              tom="blue"
              size="hero"
              rotulo="Total de Pacientes"
              valor="48"
              hint="Na clínica"
              icone={<Users />}
            />
            <StatCard
              tom="lavender"
              rotulo="Sessões em Andamento"
              valor="2"
              hint="Pendentes de finalização"
              icone={<Clock />}
            />
            <StatCard
              tom="mint"
              rotulo="Sessões este Mês"
              valor="56"
              hint="Sessões finalizadas"
              icone={<CheckCircle2 />}
            />
            <StatCard
              tom="peach"
              rotulo="Anamneses Pendentes"
              valor="3"
              hint="Em rascunho"
              icone={<ClipboardList />}
            />
          </div>

          {/* ── Painéis ── */}
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Panel
              titulo="Agenda de Hoje"
              subtitulo="Seus agendamentos para hoje"
              icone={<CalendarDays />}
              acoes={
                <Segmented
                  valor={aba}
                  onChange={setAba}
                  opcoes={[
                    { valor: "proximos", rotulo: "Próximos" },
                    { valor: "todos", rotulo: "Todos" },
                  ]}
                />
              }
              rodape={
                <>
                  <span>52 agendamentos a seguir</span>
                  <ActionButton variant="secondary" size="sm">
                    Abrir agenda
                  </ActionButton>
                </>
              }
            >
              <ul className="divide-y divide-hairline">
                {AGENDA.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 py-3">
                    <div className="w-16 shrink-0">
                      <p className="tabular text-[1.25rem] leading-none font-semibold text-ink">
                        {a.hora}
                      </p>
                      <p className="mt-1 text-[0.7rem] text-ink-3">50 min</p>
                    </div>
                    <PersonAvatar nome={a.nome} />
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.95rem] font-semibold text-ink">{a.nome}</p>
                        <p className="truncate text-xs text-ink-3">
                          {a.prof} · {a.sala}
                        </p>
                      </div>
                      <StatusPill status="Em atendimento">Em atendimento</StatusPill>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              variant="night"
              titulo="Sessões Pendentes"
              subtitulo="Sessões em andamento que precisam ser finalizadas"
              icone={<Clock />}
              acoes={<span className="rounded-full bg-white/15 px-2.5 py-1 text-[0.72rem]">2</span>}
            >
              <div className="space-y-3">
                {["Arthur Almeida Teixeira", "Miguel Esteves Siqueira"].map((nome) => (
                  <div key={nome} className="rounded-2xl bg-white/5 p-4">
                    <span className="inline-flex items-center gap-1.5 text-[0.72rem] text-white/75">
                      <span className="size-1.5 rounded-full bg-[color:var(--night-accent)]" />
                      Em andamento
                    </span>
                    <div className="mt-2 flex items-center gap-3">
                      <PersonAvatar nome={nome} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[1.05rem] font-semibold text-white">{nome}</p>
                        <p className="truncate text-xs text-white/65">Currículo Inicial</p>
                      </div>
                      <ActionButton variant="night" size="sm">
                        <Play />
                        Continuar
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* ── Controles ── */}
          <Panel titulo="Controles" icone={<ClipboardList />}>
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <ActionButton size="sm">Pequeno</ActionButton>
                <ActionButton>Primário</ActionButton>
                <ActionButton size="lg">
                  <Play />
                  Iniciar Sessão
                </ActionButton>
                <ActionButton variant="secondary">Secundário</ActionButton>
                <ActionButton variant="ghost">Fantasma</ActionButton>
                <ActionButton variant="danger">Excluir</ActionButton>
                <ActionButton disabled>Desabilitado</ActionButton>
                <IconButton aria-label="Exemplo">
                  <CalendarDays />
                </IconButton>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    ["info", "Agendado"],
                    ["violet", "Confirmado"],
                    ["warning", "Em atendimento"],
                    ["success", "Atendido"],
                    ["danger", "Faltou"],
                    ["neutral", "Cancelado"],
                  ] as [TomStatus, string][]
                ).map(([tom, rotulo]) => (
                  <StatusPill key={rotulo} tom={tom} ponto>
                    {rotulo}
                  </StatusPill>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <IconTile tom="brand">
                  <Users />
                </IconTile>
                <IconTile tom="success">
                  <CheckCircle2 />
                </IconTile>
                <IconTile tom="warning">
                  <Clock />
                </IconTile>
                <IconTile tom="danger">
                  <ClipboardList />
                </IconTile>
                <IconTile tom="violet">
                  <CalendarDays />
                </IconTile>
                <IconTile tom="neutral">
                  <Play />
                </IconTile>
                <PersonAvatar nome="Ana Queiroz" />
                <PersonAvatar nome="Bruno Dias" />
                <PersonAvatar nome="Carla Souza" />
                <SearchField placeholder="Buscar na clínica" className="w-[260px]" />
              </div>
            </div>
          </Panel>

          {/* ── Cabeçalho de página ──
              As quatro formas que as 57 telas usam. Antes do kit, cada tela
              inventava a sua: o botão "Voltar" aparecia em três posições
              diferentes e o badge de status em duas. */}
          <Panel
            titulo="Cabeçalho de página"
            subtitulo="PageHeader — trilha, listagem, ícone, detalhe e detalhe com avatar"
            icone={<ClipboardList />}
          >
            <div className="divide-y divide-hairline">
              <div className="pb-6">
                <PageHeader
                  migalhas={[{ label: "Dashboard", href: "/dashboard" }, { label: "Pacientes" }]}
                  titulo="Pacientes"
                  subtitulo="Gerencie os pacientes e seus atendimentos"
                  acoes={<ActionButton size="lg">Novo paciente</ActionButton>}
                />
              </div>

              <div className="py-6">
                <PageHeader
                  semTrilha
                  icone={<ClipboardList />}
                  titulo="Central de Relatórios"
                  subtitulo="Ícone em chip da marca, para a tela com identidade própria"
                />
              </div>

              <div className="py-6">
                <PageHeader
                  migalhas={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Anamneses", href: "/anamnese" },
                    { label: "Anamnese" },
                  ]}
                  voltar={{ onClick: () => {} }}
                  titulo="Anamnese"
                  subtitulo="Avaliação inicial completa do paciente"
                  meta={<StatusPill tom="success">Finalizada</StatusPill>}
                  acoes={<ActionButton variant="secondary">Exportar PDF</ActionButton>}
                />
              </div>

              <div className="pt-6">
                <PageHeader
                  semTrilha
                  voltar={{ onClick: () => {} }}
                  avatar={<PersonAvatar nome="Ana Queiroz" tamanho={48} />}
                  titulo="Ana Queiroz"
                  meta={
                    <>
                      <StatusPill tom="info">Fonoaudiologia</StatusPill>
                      <StatusPill tom="neutral">CLT</StatusPill>
                    </>
                  }
                />
              </div>
            </div>
          </Panel>

          {/* ── Movimento ──
              O `motion` entra só onde o CSS não chega. Os dois marcadores
              abaixo são a mesma peça da sidebar: um elemento que desliza. */}
          <Panel
            titulo="Movimento"
            subtitulo="Marcador deslizante, mola 380/32 — e nada se move sem o usuário agir"
            icone={<Play />}
          >
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm text-ink-3">
                  Seletor segmentado: o fundo branco escorrega entre as opções em vez de
                  piscar de lugar.
                </p>
                <Segmented
                  opcoes={[
                    { valor: "dia", rotulo: "Dia" },
                    { valor: "semana", rotulo: "Semana" },
                    { valor: "mes", rotulo: "Mês" },
                  ]}
                  valor={passo}
                  onChange={setPasso}
                />
              </div>
              <p className="text-sm text-ink-3">
                Quem desliga animação no sistema recebe a troca de cor e some com o
                deslize: <code className="rounded bg-surface-sunken px-1.5 py-0.5">
                  reducedMotion=&quot;user&quot;
                </code>{" "}
                no provedor vale para o JavaScript, não só para o CSS.
              </p>
            </div>
          </Panel>

          {/* ── Primitivos shadcn ajustados ──
              Ficam aqui para conferir que formulário, tabela e cartão falam a
              mesma língua do kit. São eles que as 39 telas usam. */}
          <Panel
            titulo="Primitivos shadcn"
            subtitulo="Ajustados para a linguagem do v2 — é o que as telas já usam"
            icone={<ClipboardList />}
          >
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Padrão</Button>
                <Button variant="outline">Contorno</Button>
                <Button variant="secondary">Secundário</Button>
                <Button variant="ghost">Fantasma</Button>
                <Button variant="destructive">Destrutivo</Button>
                <Button size="sm">Pequeno</Button>
                <Button size="lg">Grande</Button>
                <Badge>Badge</Badge>
                <Badge variant="secondary">Secundário</Badge>
                <Badge variant="destructive">Destrutivo</Badge>
                <Badge variant="outline">Contorno</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ds-nome">Nome do paciente</Label>
                  <Input id="ds-nome" placeholder="Digite o nome" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ds-sala">Sala</Label>
                  <Select>
                    <SelectTrigger id="ds-sala">
                      <SelectValue placeholder="Selecione a sala" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Sala 01</SelectItem>
                      <SelectItem value="2">Sala 02</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ds-obs">Observações</Label>
                  <Textarea id="ds-obs" placeholder="Anotações da sessão" rows={1} />
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Cartão shadcn</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Sala</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {AGENDA.map((a) => (
                        <TableRow key={a.nome}>
                          <TableCell className="font-medium">{a.nome}</TableCell>
                          <TableCell>{a.prof}</TableCell>
                          <TableCell>{a.sala}</TableCell>
                          <TableCell className="text-right">
                            <StatusPill status="Atendido">Atendido</StatusPill>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </Panel>
        </>
      </CascaV2>
    </SidebarProvider>
  );
}
