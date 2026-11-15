/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck } from "lucide-react";
import { ActionButton, Panel } from "@/components/kit";

interface AbaGeralProps {
  dados: {
    tipo: string;
    nome: string;
    observacao: string;
  };
  onChange: (dados: any) => void;
  avaliacaoId: string | null;
}

export function AbaGeral({ dados, onChange, avaliacaoId }: AbaGeralProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSalvar = async () => {
    try {
      if (!avaliacaoId || !user) return;

      setSaving(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/avaliacoes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          id: avaliacaoId,
          ...dados,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("Alterações salvas com sucesso!");
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel icone={<ClipboardCheck />} titulo="Informações Gerais" subtitulo="Defina o tipo e nome da avaliação">
      <div className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tipo">
              Tipo de Avaliação <span className="text-danger-ink">*</span>
            </Label>
            <Select
              value={dados.tipo}
              onValueChange={(value) => onChange({ ...dados, tipo: value })}
              disabled={!!avaliacaoId}
            >
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AQUISICAO_HABILIDADES">
                  Aquisição de Habilidades
                </SelectItem>
                <SelectItem value="REDUCAO_COMPORTAMENTOS">
                  Redução de Comportamentos
                </SelectItem>
              </SelectContent>
            </Select>
            {!!avaliacaoId && (
              <p className="text-[0.75rem] text-ink-3">
                O tipo não pode ser alterado após a criação
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nome">
              Nome da Avaliação <span className="text-danger-ink">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Ex: Avaliação Inicial VB-MAPP"
              value={dados.nome}
              onChange={(e) => onChange({ ...dados, nome: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              placeholder="Observações sobre esta avaliação..."
              rows={4}
              value={dados.observacao}
              onChange={(e) =>
                onChange({ ...dados, observacao: e.target.value })
              }
            />
          </div>
        </div>

        {avaliacaoId && (
          <div className="flex justify-end">
            <ActionButton onClick={handleSalvar} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </ActionButton>
          </div>
        )}

        {avaliacaoId && (
          <div className="rounded-2xl bg-brand-soft px-4 py-3 text-brand">
            <p className="text-sm">
              ✓ Avaliação salva! Agora você pode adicionar Níveis, Habilidades,
              Pontuações e Tarefas usando as abas acima.
            </p>
          </div>
        )}

        {!avaliacaoId && (
          <div className="bg-warning-soft border border-warning-soft text-warning-ink px-4 py-3 rounded">
            <p className="text-sm">
              ⚠ Salve as informações gerais primeiro para habilitar as outras
              abas.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
