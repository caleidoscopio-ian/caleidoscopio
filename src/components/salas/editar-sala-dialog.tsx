"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Edit, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const salaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  capacidade: z.string().optional(),
  recursos: z.array(z.string()).optional(),
  cor: z.string().optional(),
  ativo: z.boolean(),
});

type SalaFormData = z.infer<typeof salaSchema>;

interface Sala {
  id: string;
  nome: string;
  descricao?: string;
  capacidade?: number;
  recursos: string[];
  cor?: string;
  ativo: boolean;
}

interface EditarSalaDialogProps {
  sala: Sala;
  onSuccess?: () => void;
}

export function EditarSalaDialog({ sala, onSuccess }: EditarSalaDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [novoRecurso, setNovoRecurso] = useState("");
  const [recursos, setRecursos] = useState<string[]>([]);

  const form = useForm<SalaFormData>({
    resolver: zodResolver(salaSchema),
    defaultValues: {
      nome: sala.nome,
      descricao: sala.descricao || "",
      capacidade: sala.capacidade?.toString() || "",
      recursos: sala.recursos || [],
      cor: sala.cor || "#3b82f6",
      ativo: sala.ativo,
    },
  });

  useEffect(() => {
    if (open) {
      setRecursos(sala.recursos || []);
      form.reset({
        nome: sala.nome,
        descricao: sala.descricao || "",
        capacidade: sala.capacidade?.toString() || "",
        recursos: sala.recursos || [],
        cor: sala.cor || "#3b82f6",
        ativo: sala.ativo,
      });
    }
  }, [open, sala, form]);

  const adicionarRecurso = () => {
    if (novoRecurso.trim() && !recursos.includes(novoRecurso.trim())) {
      setRecursos([...recursos, novoRecurso.trim()]);
      setNovoRecurso("");
    }
  };

  const removerRecurso = (recurso: string) => {
    setRecursos(recursos.filter((r) => r !== recurso));
  };

  const onSubmit = async (data: SalaFormData) => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/salas", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          id: sala.id,
          ...data,
          recursos,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar sala");
      }

      toast({
        title: "Sucesso!",
        description: "Sala atualizada com sucesso",
      });

      setOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar sala:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao atualizar sala",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Sala</DialogTitle>
          <DialogDescription>
            Atualize os dados da sala. Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nome */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Sala 1, Sala Sensorial..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição opcional da sala..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Capacidade e Cor */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Número de pessoas"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Capacidade máxima de pessoas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor de Identificação</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Input type="color" {...field} className="w-20 h-10" />
                        <Input value={field.value} readOnly className="flex-1" />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Cor para identificação visual
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recursos */}
            <div className="space-y-3">
              <FormLabel>Recursos Disponíveis</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Projetor, Computador..."
                  value={novoRecurso}
                  onChange={(e) => setNovoRecurso(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarRecurso();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={adicionarRecurso}
                >
                  Adicionar
                </Button>
              </div>
              {recursos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {recursos.map((recurso) => (
                    <Badge key={recurso} variant="secondary">
                      {recurso}
                      <button
                        type="button"
                        onClick={() => removerRecurso(recurso)}
                        className="ml-2 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <FormDescription>
                Adicione os recursos disponíveis na sala
              </FormDescription>
            </div>

            {/* Status Ativo */}
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Sala Ativa</FormLabel>
                    <FormDescription>
                      Salas inativas não aparecem no agendamento
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
