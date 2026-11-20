/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList, Plus, Trash2, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { Panel, EstadoVazio } from "@/components/kit";

interface Atividade {
  id: string;
  nome: string;
  protocolo?: string;
  habilidade?: string;
}

interface AtividadeSelecionada {
  atividadeId: string;
  ordem: number;
  atividade: Atividade;
}

interface AbaAtividadesProps {
  curriculumId: string | null;
  onSave: () => void;
}

// O Select do Radix não aceita value vazio — sentinela para "sem filtro"
const TODOS = "__todos__";

const ordenarPtBr = (valores: Iterable<string>) =>
  [...new Set(valores)].sort((a, b) => a.localeCompare(b, "pt-BR"));

export function AbaAtividades({ curriculumId, onSave }: AbaAtividadesProps) {
  const { user } = useAuth();
  const [atividadesDisponiveis, setAtividadesDisponiveis] = useState<
    Atividade[]
  >([]);
  const [atividadesSelecionadas, setAtividadesSelecionadas] = useState<
    AtividadeSelecionada[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [atividadeParaAdicionar, setAtividadeParaAdicionar] = useState("");
  const [filtroProtocolo, setFiltroProtocolo] = useState(TODOS);
  const [filtroHabilidade, setFiltroHabilidade] = useState(TODOS);

  // Só o que ainda não está no plano — e as opções dos filtros saem daqui,
  // para nunca oferecer um protocolo/habilidade que resulte em lista vazia
  const atividadesNaoAdicionadas = useMemo(
    () =>
      atividadesDisponiveis.filter(
        (a) => !atividadesSelecionadas.some((s) => s.atividadeId === a.id)
      ),
    [atividadesDisponiveis, atividadesSelecionadas]
  );

  const opcoesProtocolo = useMemo(
    () =>
      ordenarPtBr(
        atividadesNaoAdicionadas.flatMap((a) => (a.protocolo ? [a.protocolo] : []))
      ),
    [atividadesNaoAdicionadas]
  );

  const doProtocolo = useMemo(
    () =>
      filtroProtocolo === TODOS
        ? atividadesNaoAdicionadas
        : atividadesNaoAdicionadas.filter((a) => a.protocolo === filtroProtocolo),
    [atividadesNaoAdicionadas, filtroProtocolo]
  );

  // Habilidade depende do protocolo ("Escrita" existe em mais de um)
  const opcoesHabilidade = useMemo(
    () => ordenarPtBr(doProtocolo.flatMap((a) => (a.habilidade ? [a.habilidade] : []))),
    [doProtocolo]
  );

  const atividadesFiltradas = useMemo(
    () =>
      filtroHabilidade === TODOS
        ? doProtocolo
        : doProtocolo.filter((a) => a.habilidade === filtroHabilidade),
    [doProtocolo, filtroHabilidade]
  );

  const filtroAtivo = filtroProtocolo !== TODOS || filtroHabilidade !== TODOS;

  // Filtro aplica na hora: escolha que deixou de valer é descartada, para a
  // tela nunca mostrar um valor selecionado que a lista não contém
  useEffect(() => {
    if (filtroHabilidade !== TODOS && !opcoesHabilidade.includes(filtroHabilidade)) {
      setFiltroHabilidade(TODOS);
    }
  }, [opcoesHabilidade, filtroHabilidade]);

  useEffect(() => {
    if (
      atividadeParaAdicionar &&
      !atividadesFiltradas.some((a) => a.id === atividadeParaAdicionar)
    ) {
      setAtividadeParaAdicionar("");
    }
  }, [atividadesFiltradas, atividadeParaAdicionar]);

  useEffect(() => {
    if (curriculumId) {
      fetchData();
    }
  }, [curriculumId, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!user || !curriculumId) return;

      const userDataEncoded = btoa(JSON.stringify(user));

      // Buscar curriculum com atividades
      const curriculumResponse = await fetch(
        `/api/curriculum?id=${curriculumId}`,
        {
          headers: {
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        }
      );

      const curriculumResult = await curriculumResponse.json();

      if (curriculumResult.success && curriculumResult.data.atividades) {
        setAtividadesSelecionadas(
          curriculumResult.data.atividades.map((a: any) => ({
            atividadeId: a.atividadeId,
            ordem: a.ordem,
            atividade: a.atividade,
          }))
        );
      }

      // Buscar todas as atividades disponíveis
      const atividadesResponse = await fetch("/api/atividades", {
        headers: {
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const atividadesResult = await atividadesResponse.json();

      if (atividadesResult.success) {
        setAtividadesDisponiveis(atividadesResult.data);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionar = () => {
    if (!atividadeParaAdicionar) {
      alert("Selecione uma atividade");
      return;
    }

    const atividade = atividadesDisponiveis.find(
      (a) => a.id === atividadeParaAdicionar
    );

    if (!atividade) return;

    // Verificar se já está adicionada
    if (
      atividadesSelecionadas.some((a) => a.atividadeId === atividade.id)
    ) {
      alert("Esta atividade já foi adicionada ao plano");
      return;
    }

    const novaAtividade: AtividadeSelecionada = {
      atividadeId: atividade.id,
      ordem: atividadesSelecionadas.length + 1,
      atividade,
    };

    setAtividadesSelecionadas([...atividadesSelecionadas, novaAtividade]);
    setAtividadeParaAdicionar("");
    setDialogOpen(false);
  };

  const handleRemover = (index: number) => {
    const novasAtividades = atividadesSelecionadas.filter(
      (_, i) => i !== index
    );
    // Reordenar
    const atividadesReordenadas = novasAtividades.map((a, i) => ({
      ...a,
      ordem: i + 1,
    }));
    setAtividadesSelecionadas(atividadesReordenadas);
    setDeleteIndex(null);
  };

  const handleMoverParaCima = (index: number) => {
    if (index === 0) return;

    const novasAtividades = [...atividadesSelecionadas];
    [novasAtividades[index - 1], novasAtividades[index]] = [
      novasAtividades[index],
      novasAtividades[index - 1],
    ];

    // Atualizar ordem
    const atividadesReordenadas = novasAtividades.map((a, i) => ({
      ...a,
      ordem: i + 1,
    }));
    setAtividadesSelecionadas(atividadesReordenadas);
  };

  const handleMoverParaBaixo = (index: number) => {
    if (index === atividadesSelecionadas.length - 1) return;

    const novasAtividades = [...atividadesSelecionadas];
    [novasAtividades[index], novasAtividades[index + 1]] = [
      novasAtividades[index + 1],
      novasAtividades[index],
    ];

    // Atualizar ordem
    const atividadesReordenadas = novasAtividades.map((a, i) => ({
      ...a,
      ordem: i + 1,
    }));
    setAtividadesSelecionadas(atividadesReordenadas);
  };

  const handleSalvarTudo = async () => {
    try {
      if (!user || !curriculumId) return;

      setSaving(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/curriculum", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          id: curriculumId,
          atividades: atividadesSelecionadas.map((a) => ({
            atividadeId: a.atividadeId,
            ordem: a.ordem,
          })),
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("Atividades salvas com sucesso!");
        await fetchData();
        onSave();
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar atividades:", error);
      alert("Erro ao salvar atividades");
    } finally {
      setSaving(false);
    }
  };

  if (!curriculumId) {
    return (
      <EstadoVazio titulo="Salve as informações gerais primeiro para adicionar atividades" />
    );
  }

  return (
    <>
      <Panel
        icone={<ClipboardList />}
        titulo="Atividades do Plano Terapêutico"
        subtitulo="Adicione e organize as atividades deste plano"
        acoes={
          <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Atividade
            </Button>
        }
      >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : atividadesSelecionadas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma atividade adicionada
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Ordem</TableHead>
                    <TableHead>Nome da Atividade</TableHead>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Habilidade</TableHead>
                    <TableHead className="w-32 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atividadesSelecionadas.map((item, index) => (
                    <TableRow key={item.atividadeId}>
                      <TableCell>
                        <Badge variant="secondary">{item.ordem}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.atividade.nome}
                      </TableCell>
                      <TableCell>
                        {item.atividade.protocolo ? (
                          <Badge variant="outline">
                            {item.atividade.protocolo}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.atividade.habilidade || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9"
                            onClick={() => handleMoverParaCima(index)}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9"
                            onClick={() => handleMoverParaBaixo(index)}
                            disabled={
                              index === atividadesSelecionadas.length - 1
                            }
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9"
                            onClick={() => setDeleteIndex(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button
                onClick={handleSalvarTudo}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Atividades"
                )}
              </Button>
            </div>
          )}
        </Panel>

      {/* Dialog Adicionar Atividade */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Atividade</DialogTitle>
            <DialogDescription>
              Selecione uma atividade para adicionar ao plano
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="filtro-protocolo">Protocolo</Label>
                <Select value={filtroProtocolo} onValueChange={setFiltroProtocolo}>
                  <SelectTrigger id="filtro-protocolo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos os protocolos</SelectItem>
                    {opcoesProtocolo.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="filtro-habilidade">Habilidade</Label>
                <Select value={filtroHabilidade} onValueChange={setFiltroHabilidade}>
                  <SelectTrigger id="filtro-habilidade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todas as habilidades</SelectItem>
                    {opcoesHabilidade.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-ink-3" aria-live="polite">
              {atividadesNaoAdicionadas.length === 0
                ? "Todas as atividades da clínica já estão neste plano"
                : filtroAtivo
                  ? `Exibindo ${atividadesFiltradas.length} de ${atividadesNaoAdicionadas.length} atividades disponíveis`
                  : `Exibindo todas as ${atividadesNaoAdicionadas.length} atividades disponíveis`}
            </p>

            <div className="grid gap-2">
              <Label htmlFor="atividade-adicionar">Atividade</Label>
              <Select
                value={atividadeParaAdicionar}
                onValueChange={setAtividadeParaAdicionar}
                disabled={atividadesFiltradas.length === 0}
              >
                <SelectTrigger id="atividade-adicionar">
                  <SelectValue placeholder="Selecione uma atividade" />
                </SelectTrigger>
                <SelectContent>
                  {atividadesFiltradas.map((atividade) => (
                    <SelectItem key={atividade.id} value={atividade.id}>
                      {atividade.nome}
                      {atividade.habilidade && ` · ${atividade.habilidade}`}
                      {atividade.protocolo && ` (${atividade.protocolo})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdicionar}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Remover */}
      <AlertDialog
        open={deleteIndex !== null}
        onOpenChange={() => setDeleteIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta atividade do plano?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteIndex !== null && handleRemover(deleteIndex)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
