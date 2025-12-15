/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface Profissional {
  id: string;
  nome: string;
  especialidade: string;
  email?: string;
}

interface VincularUsuarioFormProps {
  usuarioId: string;
  usuarioNome: string;
  profissionais: Profissional[];
  onSubmit: (usuarioId: string, profissionalId: string) => Promise<void>;
  onCancel: () => void;
}

export function VincularUsuarioForm({
  usuarioId,
  usuarioNome,
  profissionais,
  onSubmit,
  onCancel,
}: VincularUsuarioFormProps) {
  const [selectedProfissional, setSelectedProfissional] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar apenas profissionais sem vínculo (usuarioId null)
  const profissionaisDisponiveis = profissionais.filter(
    (p) => !p.email || p.email === ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfissional) return;

    try {
      setIsSubmitting(true);
      await onSubmit(usuarioId, selectedProfissional);
    } catch (error) {
      console.error("Erro ao vincular:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Vinculando usuário: <strong>{usuarioNome}</strong>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="profissional">Selecione o Profissional</Label>
        <Select
          value={selectedProfissional}
          onValueChange={setSelectedProfissional}
        >
          <SelectTrigger id="profissional">
            <SelectValue placeholder="Selecione um profissional" />
          </SelectTrigger>
          <SelectContent>
            {profissionaisDisponiveis.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                Nenhum profissional disponível para vínculo
              </div>
            ) : (
              profissionaisDisponiveis.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  {prof.nome} - {prof.especialidade}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Apenas profissionais sem vínculo são exibidos
        </p>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !selectedProfissional ||
            profissionaisDisponiveis.length === 0
          }
        >
          {isSubmitting ? "Vinculando..." : "Vincular"}
        </Button>
      </div>
    </form>
  );
}
