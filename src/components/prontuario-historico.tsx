/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProntuarioDetailsDialog } from "@/components/prontuario-details-dialog";
import { EditarProntuarioForm } from "@/components/forms/editar-prontuario-form";
import { DeleteProntuarioDialog } from "@/components/delete-prontuario-dialog";
import { Loader2, Calendar, FileText, BarChart } from "lucide-react";

interface ProntuarioDetalhes {
  id: string;
  patient: {
    id: string;
    name: string;
  };
  professional: {
    id: string;
    name: string;
    specialty: string;
  };
  sessionDate: string;
  serviceType: string;
  clinicalEvolution: string;
  observations?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

interface ProntuarioHistoricoProps {
  pacienteId: string;
}

export function ProntuarioHistorico({ pacienteId }: ProntuarioHistoricoProps) {
  const { user } = useAuth();
  const [prontuarios, setProntuarios] = useState<ProntuarioDetalhes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProntuarios = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/prontuarios", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar prontuários");
      }

      if (result.success) {
        // Filtrar prontuários do paciente
        const prontuariosDoPaciente = result.data.filter(
          (p: ProntuarioDetalhes) => p.patient.id === pacienteId
        );
        setProntuarios(prontuariosDoPaciente);
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Erro ao buscar prontuários:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar prontuários"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProntuarios();
  }, [pacienteId, user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Histórico de Atendimentos
          {!loading && (
            <Badge variant="secondary" className="ml-2">
              {prontuarios.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando registros...</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Erro ao carregar registros
            </h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && prontuarios.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Nenhum registro encontrado
            </h3>
            <p className="text-muted-foreground">
              Este paciente ainda não possui registros cadastrados.
            </p>
          </div>
        )}

        {!loading && !error && prontuarios.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Sessão</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Tipo Atendimento</TableHead>
                <TableHead>Evolução Clínica</TableHead>
                <TableHead>Anexos</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prontuarios.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(record.sessionDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {record.professional.name}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {record.professional.specialty}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{record.serviceType}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="truncate text-sm">
                      {record.clinicalEvolution}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.attachments.length > 0 ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        {record.attachments.length} arquivo(s)
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(record.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <ProntuarioDetailsDialog record={record} />
                      <EditarProntuarioForm
                        record={record}
                        onSuccess={fetchProntuarios}
                      />
                      <DeleteProntuarioDialog
                        record={record}
                        onSuccess={fetchProntuarios}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
