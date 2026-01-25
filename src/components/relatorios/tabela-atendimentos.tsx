import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, XCircle, Calendar } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Atendimento {
  id: string;
  tipo: "curriculum" | "atividade" | "avaliacao" | "agendamento";
  profissional: {
    id: string;
    nome: string;
    especialidade: string;
  };
  data_hora: Date;
  finalizada_em: Date | null;
  status: string;
  nome: string;
  observacoes: string | null;
  sala?: string;
}

interface AtendimentosPorPaciente {
  paciente: {
    id: string;
    nome: string;
    nascimento: Date | null;
  };
  atendimentos: Atendimento[];
}

interface TabelaAtendimentosProps {
  agrupados: AtendimentosPorPaciente[];
}

export function TabelaAtendimentos({ agrupados }: TabelaAtendimentosProps) {
  const formatarData = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatarHora = (date: Date) => {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calcularIdade = (dataNascimento: Date | null) => {
    if (!dataNascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const getTipoBadge = (tipo: string) => {
    const tipos = {
      curriculum: { label: "Plano Terapêutico", variant: "default" as const },
      atividade: { label: "Atividade", variant: "secondary" as const },
      avaliacao: { label: "Avaliação", variant: "outline" as const },
      agendamento: { label: "Agendamento", variant: "outline" as const },
    };
    return tipos[tipo as keyof typeof tipos] || { label: tipo, variant: "outline" as const };
  };

  const getStatusIcon = (status: string) => {
    if (status === "FINALIZADA") {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    } else if (status === "CANCELADA") {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else {
      return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      FINALIZADA: "Concluída",
      EM_ANDAMENTO: "Em Andamento",
      CANCELADA: "Cancelada",
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (agrupados.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum atendimento encontrado no período selecionado
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full">
      {agrupados.map((grupo, index) => {
        const idade = calcularIdade(grupo.paciente.nascimento);

        return (
          <AccordionItem key={grupo.paciente.id} value={`paciente-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {grupo.paciente.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{grupo.paciente.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {idade !== null && `${idade} anos • `}
                      {grupo.atendimentos.length} atendimento(s)
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{grupo.atendimentos.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Atividade/Plano</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="w-[100px]">Duração</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupo.atendimentos.map((atendimento) => {
                      const tipo = getTipoBadge(atendimento.tipo);
                      const duracao = atendimento.finalizada_em
                        ? Math.round(
                            (new Date(atendimento.finalizada_em).getTime() -
                              new Date(atendimento.data_hora).getTime()) /
                              (1000 * 60)
                          )
                        : null;

                      return (
                        <TableRow key={atendimento.id}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex flex-col">
                              <span>{formatarData(atendimento.data_hora)}</span>
                              <span className="text-muted-foreground">
                                {formatarHora(atendimento.data_hora)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={tipo.variant}>{tipo.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              <p className="font-medium truncate">{atendimento.nome}</p>
                              {atendimento.observacoes && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {atendimento.observacoes}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{atendimento.profissional.nome}</p>
                              <p className="text-muted-foreground text-xs">
                                {atendimento.profissional.especialidade}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {duracao !== null ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{duracao} min</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(atendimento.status)}
                              <span className="text-sm">
                                {getStatusLabel(atendimento.status)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
