/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AbaGeralProps {
  atividadeId: string | null;
  onSave: (id: string) => void;
}

export function AbaGeral({ atividadeId, onSave }: AbaGeralProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    protocolo: "",
    nome: "",
    habilidade: "",
    marco_codificacao: "",
    tipo_ensino: "",
    qtd_alvos_sessao: 1,
    qtd_tentativas_alvo: 1,
  });

  useEffect(() => {
    if (atividadeId) {
      fetchAtividade();
    }
  }, [atividadeId]);

  const fetchAtividade = async () => {
    try {
      if (!user || !atividadeId) return;

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/atividades?id=${atividadeId}`, {
        headers: {
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (result.success && result.data) {
        setFormData({
          protocolo: result.data.protocolo || "",
          nome: result.data.nome || "",
          habilidade: result.data.habilidade || "",
          marco_codificacao: result.data.marco_codificacao || "",
          tipo_ensino: result.data.tipo_ensino || "",
          qtd_alvos_sessao: result.data.qtd_alvos_sessao || 1,
          qtd_tentativas_alvo: result.data.qtd_tentativas_alvo || 1,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar atividade:", error);
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
        ...(atividadeId ? { id: atividadeId } : {}),
      };

      const response = await fetch("/api/atividades", {
        method: atividadeId ? "PUT" : "POST",
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
          atividadeId
            ? "Alterações salvas com sucesso!"
            : "Atividade criada com sucesso!"
        );
        if (!atividadeId && result.data?.id) {
          onSave(result.data.id);
        }
      } else {
        alert(result.error || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar atividade");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Gerais</CardTitle>
        <CardDescription>
          Defina as informações básicas da atividade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="protocolo">Protocolo</Label>
            <Select
              value={formData.protocolo}
              onValueChange={(value) =>
                setFormData({ ...formData, protocolo: value })
              }
            >
              <SelectTrigger id="protocolo">
                <SelectValue placeholder="Selecione o protocolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VB-MAPP">VB-MAPP</SelectItem>
                <SelectItem value="AFLS">AFLS</SelectItem>
                <SelectItem value="Socially Savvy">Socially Savvy</SelectItem>
                <SelectItem value="Barreiras comportamentais">
                  Barreiras comportamentais
                </SelectItem>
                <SelectItem value="Portage">Portage</SelectItem>
                <SelectItem value="Denver">Denver</SelectItem>
                <SelectItem value="Escala de Desenvolvimento Motor">
                  Escala de Desenvolvimento Motor
                </SelectItem>
                <SelectItem value="Vineland-3">Vineland-3</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nome">
              Nome da Atividade <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Ex: Identificar objetos comuns"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="habilidade">Habilidade</Label>
            <Select
              value={formData.habilidade}
              onValueChange={(value) =>
                setFormData({ ...formData, habilidade: value })
              }
            >
              <SelectTrigger id="habilidade">
                <SelectValue placeholder="Selecione a habilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Competências Sociais">
                  Competências Sociais
                </SelectItem>
                <SelectItem value="Comportamentos de Atenção Conjunta">
                  Comportamentos de Atenção Conjunta
                </SelectItem>
                <SelectItem value="Competências Sociais com Pares">
                  Competências Sociais com Pares
                </SelectItem>
                <SelectItem value="Cognição">Cognição</SelectItem>
                <SelectItem value="Jogo">Jogo</SelectItem>
                <SelectItem value="Jogo de Representação">
                  Jogo de Representação
                </SelectItem>
                <SelectItem value="Motricidade Fina">
                  Motricidade Fina
                </SelectItem>
                <SelectItem value="Motricidade Grossa">
                  Motricidade Grossa
                </SelectItem>
                <SelectItem value="Comportamento">Comportamento</SelectItem>
                <SelectItem value="Comunicação Receptiva">
                  Comunicação Receptiva
                </SelectItem>
                <SelectItem value="Comunicação Expressiva">
                  Comunicação Expressiva
                </SelectItem>
                <SelectItem value="Independência Pessoal">
                  Independência Pessoal
                </SelectItem>
                <SelectItem value="Independência Pessoal:Alimentação">
                  Independência Pessoal:Alimentação
                </SelectItem>
                <SelectItem value="Independência Pessoal:Vestir">
                  Independência Pessoal:Vestir
                </SelectItem>
                <SelectItem value="Independência Pessoal:Higiene">
                  Independência Pessoal:Higiene
                </SelectItem>
                <SelectItem value="Independência Pessoal:Tarefas">
                  Independência Pessoal:Tarefas
                </SelectItem>
                <SelectItem value="Independência Pessoal:Adultos">
                  Independência Pessoal:Adultos
                </SelectItem>
                <SelectItem value="Imitação Motora">
                  Imitação Motora
                </SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="marco_codificacao">Marco/Codificação</Label>
            <Input
              id="marco_codificacao"
              placeholder="Ex: 5-M"
              value={formData.marco_codificacao}
              onChange={(e) =>
                setFormData({ ...formData, marco_codificacao: e.target.value })
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tipo_ensino">Tipo de Ensino</Label>
            <Select
              value={formData.tipo_ensino}
              onValueChange={(value) =>
                setFormData({ ...formData, tipo_ensino: value })
              }
            >
              <SelectTrigger id="tipo_ensino">
                <SelectValue placeholder="Selecione o tipo de ensino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tentativa Discreta-Estruturada">
                  Tentativa Discreta-Estruturada
                </SelectItem>
                <SelectItem value="Análise de Tarefas">
                  Análise de Tarefas
                </SelectItem>
                <SelectItem value="Ensino Naturalístico">
                  Ensino Naturalístico
                </SelectItem>
                <SelectItem value="Tentativa Discreta-Intercalada">
                  Tentativa Discreta-Intercalada
                </SelectItem>
                <SelectItem value="Frequência">Frequência</SelectItem>
                <SelectItem value="Duração">Duração</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="qtd_alvos_sessao">
                Quantidade de Alvos por Sessão
              </Label>
              <Input
                id="qtd_alvos_sessao"
                type="number"
                min="1"
                max="50"
                value={formData.qtd_alvos_sessao}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    qtd_alvos_sessao: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qtd_tentativas_alvo">
                Quantidade de Tentativas por Alvo
              </Label>
              <Input
                id="qtd_tentativas_alvo"
                type="number"
                min="1"
                max="50"
                value={formData.qtd_tentativas_alvo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    qtd_tentativas_alvo: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSalvar}
          disabled={saving || !formData.nome}
          className="w-full"
        >
          {saving
            ? "Salvando..."
            : atividadeId
              ? "Salvar Alterações"
              : "Criar Atividade"}
        </Button>

        {atividadeId && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="text-sm">
              ✓ Atividade salva! Agora você pode adicionar Pontuações/Dicas e
              Instruções usando as abas acima.
            </p>
          </div>
        )}

        {!atividadeId && (
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
