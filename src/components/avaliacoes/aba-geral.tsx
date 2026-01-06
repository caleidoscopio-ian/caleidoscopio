/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <Card>
      <CardHeader>
        <CardTitle>Informações Gerais</CardTitle>
        <CardDescription>Defina o tipo e nome da avaliação</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tipo">
              Tipo de Avaliação <span className="text-red-500">*</span>
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
              <p className="text-xs text-muted-foreground">
                O tipo não pode ser alterado após a criação
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nome">
              Nome da Avaliação <span className="text-red-500">*</span>
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
          <Button onClick={handleSalvar} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        )}

        {avaliacaoId && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="text-sm">
              ✓ Avaliação salva! Agora você pode adicionar Níveis, Habilidades,
              Pontuações e Tarefas usando as abas acima.
            </p>
          </div>
        )}

        {!avaliacaoId && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            <p className="text-sm">
              ⚠ Salve as informações gerais primeiro para habilitar as outras
              abas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
