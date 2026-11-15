"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel, SecaoInfo, GradeCampos, CampoInfo } from "@/components/kit";
import {
  User,
  FileText,
  Activity,
  Send,
  Pill,
  Stethoscope,
  FileBarChart,
  Paperclip,
  FolderOpen,
  Contact,
  ShieldCheck,
  Landmark,
} from "lucide-react";
import { formatarDataCivil, idadeEmAnos } from "@/lib/datas-fuso";
import { ProntuarioAnamnese } from "./prontuario-anamnese";
import { ProntuarioEvolucao } from "./prontuario-evolucao";
import { ProntuarioEncaminhamento } from "./prontuario-encaminhamento";
import { ProntuarioPrescricao } from "./prontuario-prescricao";
import { ProntuarioDiagnostico } from "./prontuario-diagnostico";
import { ProntuarioRelatorios } from "./prontuario-relatorios";
import { ProntuarioAnexos } from "./prontuario-anexos";
import { ProntuarioHistorico } from "./prontuario-historico";

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

export function ProntuarioTabs({
  patient,
  activeTab,
  setActiveTab,
  dialogOpen,
  onDialogChange,
}: ProntuarioTabsProps) {
  // Calcular idade

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="lg:grid-cols-9">
        <TabsTrigger value="dados" className="flex items-center gap-1">
          <User className="h-4 w-4" />
          <span>Dados</span>
        </TabsTrigger>
        <TabsTrigger value="anamnese" className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          <span>Anamnese</span>
        </TabsTrigger>
        <TabsTrigger value="evolucao" className="flex items-center gap-1">
          <Activity className="h-4 w-4" />
          <span>Evolução</span>
        </TabsTrigger>
        <TabsTrigger value="encaminhamento" className="flex items-center gap-1">
          <Send className="h-4 w-4" />
          <span>Encaminhamento</span>
        </TabsTrigger>
        <TabsTrigger value="prescricao" className="flex items-center gap-1">
          <Pill className="h-4 w-4" />
          <span>Prescrição</span>
        </TabsTrigger>
        <TabsTrigger value="diagnostico" className="flex items-center gap-1">
          <Stethoscope className="h-4 w-4" />
          <span>Diagnóstico</span>
        </TabsTrigger>
        <TabsTrigger value="relatorios" className="flex items-center gap-1">
          <FileBarChart className="h-4 w-4" />
          <span>Relatórios</span>
        </TabsTrigger>
        <TabsTrigger value="prontuarios" className="flex items-center gap-1">
          <FolderOpen className="h-4 w-4" />
          <span>Registros</span>
        </TabsTrigger>
        <TabsTrigger value="anexos" className="flex items-center gap-1">
          <Paperclip className="h-4 w-4" />
          <span>Anexos</span>
        </TabsTrigger>
      </TabsList>

      {/* ABA: Dados Principais */}
      <TabsContent value="dados">
        <Panel
          icone={<User />}
          titulo="Dados Principais"
          subtitulo="Informações cadastrais e pessoais do paciente"
        >
          <div className="space-y-7">
            <SecaoInfo icone={<User />} titulo="Informações Pessoais">
              <GradeCampos>
                <CampoInfo rotulo="Nome completo" valor={patient.name} />
                <CampoInfo rotulo="CPF" valor={patient.cpf} />
                <CampoInfo
                  rotulo="Data de nascimento"
                  valor={`${formatarDataCivil(patient.birthDate)} (${idadeEmAnos(patient.birthDate) ?? "—"} anos)`}
                />
                <CampoInfo
                  rotulo="Escolaridade"
                  valor={patient.escolaridade ? escolaridadeLabels[patient.escolaridade] : null}
                />
                <CampoInfo
                  rotulo="Estado civil"
                  valor={patient.estado_civil ? estadoCivilLabels[patient.estado_civil] : null}
                />
              </GradeCampos>
            </SecaoInfo>

            <SecaoInfo icone={<Contact />} titulo="Informações de Contato">
              <GradeCampos>
                <CampoInfo rotulo="E-mail" valor={patient.email} />
                <CampoInfo rotulo="Telefone" valor={patient.phone} />
                <CampoInfo rotulo="Endereço" valor={patient.address} larguraTotal />
              </GradeCampos>
            </SecaoInfo>

            <SecaoInfo icone={<ShieldCheck />} titulo="Responsáveis">
              <GradeCampos colunas={2}>
                <CampoInfo rotulo="Responsável financeiro" valor={patient.guardianName} />
                <CampoInfo rotulo="Contato de emergência" valor={patient.guardianPhone} />
              </GradeCampos>
            </SecaoInfo>

            <SecaoInfo icone={<Landmark />} titulo="Plano de Saúde">
              <GradeCampos colunas={2}>
                <CampoInfo
                  rotulo="Convênio"
                  valor={patient.healthInsurance}
                  vazio="Particular"
                />
                <CampoInfo
                  rotulo="Número da matrícula"
                  valor={patient.healthInsuranceNumber}
                />
              </GradeCampos>
            </SecaoInfo>
          </div>
        </Panel>
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

      {/* ABA: Registros de Sessão */}
      <TabsContent value="prontuarios">
        <ProntuarioHistorico pacienteId={patient.id} />
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
