"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  User,
  FileText,
  Activity,
  Send,
  Pill,
  Stethoscope,
  FileBarChart,
  Paperclip,
} from "lucide-react";
import { ProntuarioAnamnese } from "./prontuario-anamnese";
import { ProntuarioEvolucao } from "./prontuario-evolucao";
import { ProntuarioEncaminhamento } from "./prontuario-encaminhamento";
import { ProntuarioPrescricao } from "./prontuario-prescricao";
import { ProntuarioDiagnostico } from "./prontuario-diagnostico";
import { ProntuarioRelatorios } from "./prontuario-relatorios";
import { ProntuarioAnexos } from "./prontuario-anexos";

interface Patient {
  id: string;
  name: string;
  cpf?: string;
  birthDate: string;
  email?: string;
  phone?: string;
  address?: string;
  escolaridade?: string;
  estado_civil?: string;
  guardianName?: string;
  guardianPhone?: string;
  healthInsurance?: string;
  healthInsuranceNumber?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProntuarioTabsProps {
  patient: Patient;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dialogOpen: boolean;
  onDialogChange: (open: boolean) => void;
}

// Mapear enums para textos legíveis
const escolaridadeLabels: Record<string, string> = {
  NAO_ALFABETIZADO: "Não Alfabetizado",
  FUNDAMENTAL_INCOMPLETO: "Fundamental Incompleto",
  FUNDAMENTAL_COMPLETO: "Fundamental Completo",
  MEDIO_INCOMPLETO: "Médio Incompleto",
  MEDIO_COMPLETO: "Médio Completo",
  SUPERIOR_INCOMPLETO: "Superior Incompleto",
  SUPERIOR_COMPLETO: "Superior Completo",
  POS_GRADUACAO: "Pós-Graduação",
};

const estadoCivilLabels: Record<string, string> = {
  SOLTEIRO: "Solteiro(a)",
  CASADO: "Casado(a)",
  DIVORCIADO: "Divorciado(a)",
  VIUVO: "Viúvo(a)",
  UNIAO_ESTAVEL: "União Estável",
};

export function ProntuarioTabs({ patient, activeTab, setActiveTab, dialogOpen, onDialogChange }: ProntuarioTabsProps) {

  // Calcular idade
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
        <TabsTrigger value="dados" className="flex items-center gap-1">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Dados</span>
        </TabsTrigger>
        <TabsTrigger value="anamnese" className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Anamnese</span>
        </TabsTrigger>
        <TabsTrigger value="evolucao" className="flex items-center gap-1">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Evolução</span>
        </TabsTrigger>
        <TabsTrigger value="encaminhamento" className="flex items-center gap-1">
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Encam.</span>
        </TabsTrigger>
        <TabsTrigger value="prescricao" className="flex items-center gap-1">
          <Pill className="h-4 w-4" />
          <span className="hidden sm:inline">Prescrição</span>
        </TabsTrigger>
        <TabsTrigger value="diagnostico" className="flex items-center gap-1">
          <Stethoscope className="h-4 w-4" />
          <span className="hidden sm:inline">Diagnóstico</span>
        </TabsTrigger>
        <TabsTrigger value="relatorios" className="flex items-center gap-1">
          <FileBarChart className="h-4 w-4" />
          <span className="hidden sm:inline">Relatórios</span>
        </TabsTrigger>
        <TabsTrigger value="anexos" className="flex items-center gap-1">
          <Paperclip className="h-4 w-4" />
          <span className="hidden sm:inline">Anexos</span>
        </TabsTrigger>
      </TabsList>

      {/* ABA: Dados Principais */}
      <TabsContent value="dados">
        <Card>
          <CardHeader>
            <CardTitle>Dados Principais</CardTitle>
            <CardDescription>
              Informações cadastrais e pessoais do paciente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dados Pessoais */}
            <div>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                Informações Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nome Completo
                  </label>
                  <p className="text-base">{patient.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    CPF
                  </label>
                  <p className="text-base">{patient.cpf || "Não informado"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Data de Nascimento
                  </label>
                  <p className="text-base">
                    {new Date(patient.birthDate).toLocaleDateString("pt-BR")} (
                    {calculateAge(patient.birthDate)} anos)
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Escolaridade
                  </label>
                  <p className="text-base">
                    {patient.escolaridade
                      ? escolaridadeLabels[patient.escolaridade]
                      : "Não informado"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Estado Civil
                  </label>
                  <p className="text-base">
                    {patient.estado_civil
                      ? estadoCivilLabels[patient.estado_civil]
                      : "Não informado"}
                  </p>
                </div>
              </div>
            </div>

            {/* Contato */}
            <div>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                Informações de Contato
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    E-mail
                  </label>
                  <p className="text-base">{patient.email || "Não informado"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Telefone
                  </label>
                  <p className="text-base">{patient.phone || "Não informado"}</p>
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-medium text-muted-foreground">
                    Endereço
                  </label>
                  <p className="text-base">{patient.address || "Não informado"}</p>
                </div>
              </div>
            </div>

            {/* Responsáveis */}
            <div>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                Responsáveis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Responsável Financeiro
                  </label>
                  <p className="text-base">
                    {patient.guardianName || "Não informado"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Contato de Emergência
                  </label>
                  <p className="text-base">
                    {patient.guardianPhone || "Não informado"}
                  </p>
                </div>
              </div>
            </div>

            {/* Plano de Saúde */}
            <div>
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">
                Plano de Saúde
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Convênio
                  </label>
                  <p className="text-base">
                    {patient.healthInsurance || "Particular"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Número da Matrícula
                  </label>
                  <p className="text-base">
                    {patient.healthInsuranceNumber || "Não informado"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ABA: Anamnese */}
      <TabsContent value="anamnese">
        <ProntuarioAnamnese pacienteId={patient.id} />
      </TabsContent>

      {/* ABA: Evolução Clínica */}
      <TabsContent value="evolucao">
        <ProntuarioEvolucao pacienteId={patient.id} />
      </TabsContent>

      {/* ABA: Encaminhamento */}
      <TabsContent value="encaminhamento">
        <ProntuarioEncaminhamento
          pacienteId={patient.id}
          dialogOpen={dialogOpen}
          onOpenDialog={onDialogChange}
        />
      </TabsContent>

      {/* ABA: Prescrição Médica */}
      <TabsContent value="prescricao">
        <ProntuarioPrescricao
          pacienteId={patient.id}
          dialogOpen={dialogOpen}
          onOpenDialog={onDialogChange}
        />
      </TabsContent>

      {/* ABA: Diagnóstico/Laudo */}
      <TabsContent value="diagnostico">
        <ProntuarioDiagnostico
          pacienteId={patient.id}
          dialogOpen={dialogOpen}
          onOpenDialog={onDialogChange}
        />
      </TabsContent>

      {/* ABA: Relatórios */}
      <TabsContent value="relatorios">
        <ProntuarioRelatorios
          pacienteId={patient.id}
          dialogOpen={dialogOpen}
          onOpenDialog={onDialogChange}
        />
      </TabsContent>

      {/* ABA: Anexos */}
      <TabsContent value="anexos">
        <ProntuarioAnexos
          pacienteId={patient.id}
          dialogOpen={dialogOpen}
          onOpenDialog={onDialogChange}
        />
      </TabsContent>
    </Tabs>
  );
}
