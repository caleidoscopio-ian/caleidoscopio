/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { UserPlus, Loader2, Search, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scrollarea";

interface Curriculum {
  id: string;
  nome: string;
  descricao?: string;
}

interface Paciente {
  id: string;
  name: string;
  cpf?: string;
  profissional?: {
    nome: string;
  };
}

interface AtribuirCurriculumDialogProps {
  curriculum: Curriculum;
  onSuccess: () => void;
}

export function AtribuirCurriculumDialog({
  curriculum,
  onSuccess,
}: AtribuirCurriculumDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPacientes, setSelectedPacientes] = useState<string[]>([]);

  // Buscar pacientes
  const fetchPacientes = async () => {
    try {
      setLoadingPacientes(true);
      setError(null);

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/pacientes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar pacientes");
      }

      if (result.success) {
        setPacientes(result.data);
      }
    } catch (err) {
      console.error("Erro ao buscar pacientes:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar pacientes"
      );
    } finally {
      setLoadingPacientes(false);
    }
  };

  // Atribuir curriculum aos pacientes selecionados
  const handleAtribuir = async () => {
    if (selectedPacientes.length === 0) {
      setError("Selecione pelo menos um paciente");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      // Atribuir para cada paciente selecionado
      const promises = selectedPacientes.map((pacienteId) =>
        fetch("/api/curriculum/atribuir", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
          body: JSON.stringify({
            pacienteId,
            curriculumId: curriculum.id,
          }),
        })
      );

      const responses = await Promise.all(promises);

      // Verificar se todas as requisições foram bem sucedidas
      const errors = [];
      for (const response of responses) {
        if (!response.ok) {
          const result = await response.json();
          errors.push(result.error || "Erro desconhecido");
        }
      }

      if (errors.length > 0) {
        throw new Error(errors[0]);
      }

      setOpen(false);
      setSelectedPacientes([]);
      onSuccess();
    } catch (err) {
      console.error("Erro ao atribuir curriculum:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao atribuir curriculum"
      );
    } finally {
      setLoading(false);
    }
  };

  // Quando abrir o dialog, buscar pacientes
  useEffect(() => {
    if (open) {
      fetchPacientes();
    }
  }, [open]);

  // Filtrar pacientes
  const filteredPacientes = pacientes.filter(
    (paciente) =>
      (paciente.name &&
        paciente.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (paciente.cpf && paciente.cpf.includes(searchTerm))
  );

  // Toggle seleção de paciente
  const togglePaciente = (pacienteId: string) => {
    setSelectedPacientes((prev) =>
      prev.includes(pacienteId)
        ? prev.filter((id) => id !== pacienteId)
        : [...prev, pacienteId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Atribuir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Atribuir Curriculum a Pacientes</DialogTitle>
          <DialogDescription>
            Selecione os pacientes que receberão este curriculum
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do curriculum */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="font-medium">{curriculum.nome}</div>
            {curriculum.descricao && (
              <div className="text-sm text-muted-foreground mt-1">
                {curriculum.descricao}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Busca de pacientes */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {selectedPacientes.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedPacientes.length} paciente(s) selecionado(s)
              </div>
            )}
          </div>

          {/* Lista de pacientes */}
          <ScrollArea className="max-h-[400px] border rounded-lg">
            {loadingPacientes && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">
                  Carregando pacientes...
                </p>
              </div>
            )}

            {!loadingPacientes && filteredPacientes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">
                  Nenhum paciente encontrado
                </p>
              </div>
            )}

            {!loadingPacientes && filteredPacientes.length > 0 && (
              <div className="space-y-2 p-4">
                {filteredPacientes.map((paciente) => (
                  <div
                    key={paciente.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedPacientes.includes(paciente.id)
                        ? "bg-primary/5 border-primary"
                        : ""
                    }`}
                    onClick={() => togglePaciente(paciente.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedPacientes.includes(paciente.id)}
                        onCheckedChange={() => togglePaciente(paciente.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{paciente.name}</div>
                        {paciente.cpf && (
                          <div className="text-xs text-muted-foreground">
                            CPF: {paciente.cpf}
                          </div>
                        )}
                        {paciente.profissional && (
                          <div className="text-xs text-muted-foreground">
                            Terapeuta: {paciente.profissional.nome}
                          </div>
                        )}
                      </div>
                      {selectedPacientes.includes(paciente.id) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAtribuir}
            disabled={loading || selectedPacientes.length === 0}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Atribuir a {selectedPacientes.length} paciente(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
