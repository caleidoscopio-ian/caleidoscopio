/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown } from "lucide-react";

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
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Salve as informações gerais primeiro para adicionar atividades
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Atividades do Plano Terapêutico</CardTitle>
              <CardDescription>
                Adicione e organize as atividades deste plano
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Atividade
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                            onClick={() => handleMoverParaCima(index)}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
        </CardContent>
      </Card>

      {/* Dialog Adicionar Atividade */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Atividade</DialogTitle>
            <DialogDescription>
              Selecione uma atividade para adicionar ao plano
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={atividadeParaAdicionar}
              onValueChange={setAtividadeParaAdicionar}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma atividade" />
              </SelectTrigger>
              <SelectContent>
                {atividadesDisponiveis
                  .filter(
                    (a) =>
                      !atividadesSelecionadas.some(
                        (s) => s.atividadeId === a.id
                      )
                  )
                  .map((atividade) => (
                    <SelectItem key={atividade.id} value={atividade.id}>
                      {atividade.nome}
                      {atividade.protocolo && ` (${atividade.protocolo})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
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
