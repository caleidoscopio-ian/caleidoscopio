/* eslint-disable react-hooks/exhaustive-deps */

"use client";

import { useState, useEffect } from "react";
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

interface AbaGeralProps {
  curriculumId: string | null;
  onSave: (id: string) => void;
}

export function AbaGeral({ curriculumId, onSave }: AbaGeralProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    observacao: "",
  });

  useEffect(() => {
    if (curriculumId) {
      fetchCurriculum();
    }
  }, [curriculumId]);

  const fetchCurriculum = async () => {
    try {
      if (!user || !curriculumId) return;

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/curriculum?id=${curriculumId}`, {
        headers: {
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (result.success && result.data) {
        setFormData({
          nome: result.data.nome || "",
          descricao: result.data.descricao || "",
          observacao: result.data.observacao || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar plano terapêutico:", error);
    }
  };

  const handleSalvar = async () => {
    try {
      if (!user) return;

      if (!formData.nome) {
        alert("Nome é obrigatório");
        return;
      }

      setSaving(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const payload = {
        ...formData,
        ...(curriculumId ? { id: curriculumId } : {}),
      };

      const response = await fetch("/api/curriculum", {
        method: curriculumId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          curriculumId
            ? "Alterações salvas com sucesso!"
            : "Curriculum criado com sucesso!"
        );
        if (!curriculumId && result.data?.id) {
          onSave(result.data.id);
        }
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar plano terapêutico");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Gerais</CardTitle>
        <CardDescription>
          Defina as informações básicas do plano terapêutico
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">
              Nome do Plano Terapêutico <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Ex: Programa de Habilidades Sociais"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Descrição do plano..."
              rows={4}
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              placeholder="Observações adicionais..."
              rows={3}
              value={formData.observacao}
              onChange={(e) =>
                setFormData({ ...formData, observacao: e.target.value })
              }
            />
          </div>
        </div>

        <Button
          onClick={handleSalvar}
          disabled={saving || !formData.nome}
          className="w-full"
        >
          {saving
            ? "Salvando..."
            : curriculumId
              ? "Salvar Alterações"
              : "Criar Plano Terapêutico"}
        </Button>

        {curriculumId && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="text-sm">
              ✓ Plano Terapêutico salvo! Agora você pode adicionar Atividades usando a
              aba acima.
            </p>
          </div>
        )}

        {!curriculumId && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            <p className="text-sm">
              ⚠ Salve as informações gerais primeiro para habilitar a aba de
              Atividades.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
