'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Calendar, User, Phone, Mail, MapPin, Shield, CreditCard, Stethoscope, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'

const SEXO_LABELS: Record<string, string> = {
  MASCULINO: 'Masculino',
  FEMININO: 'Feminino',
  OUTRO: 'Outro',
  PREFIRO_NAO_INFORMAR: 'Prefiro não informar',
}

const PARENTESCO_LABELS: Record<string, string> = {
  PAI: 'Pai',
  MAE: 'Mãe',
  TUTOR_LEGAL: 'Tutor Legal',
  AVO: 'Avô(ó)',
  IRMAO: 'Irmão(ã)',
  OUTRO: 'Outro',
}

interface ResponsavelData {
  id?: string
  nome: string
  telefone?: string | null
  parentesco: string
  cpf?: string | null
  financeiro: boolean
}

interface ConvenioVinculado {
  id?: string
  convenioId: string
  numero_carteirinha?: string | null
  principal: boolean
  convenio?: { id: string; razao_social: string; nome_fantasia: string | null }
}

interface ProfissionalOption {
  id: string
  name: string
  especialidade: string
}

interface Patient {
  id: string
  name: string
  cpf: string
  birthDate: string
  email?: string
  phone?: string
  address?: string
  sexo?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  guardianName?: string
  guardianPhone?: string
  healthInsurance?: string
  healthInsuranceNumber?: string
  convenioId?: string | null
  convenio?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  profissionalId?: string | null
  profissional?: { id: string; nome: string; especialidade: string } | null
  responsaveis?: ResponsavelData[]
  convenios?: ConvenioVinculado[]
  createdAt: string
  updatedAt: string
}

interface PacienteDetailsDialogProps {
  patient: Patient
  onSuccess?: () => void
}

export function PacienteDetailsDialog({ patient, onSuccess }: PacienteDetailsDialogProps) {
  const { user, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([])
  const [profissionalSelecionado, setProfissionalSelecionado] = useState(patient.profissionalId || '_none')
  const [reatribuindo, setReatribuindo] = useState(false)

  useEffect(() => {
    if (!open) return
    setProfissionalSelecionado(patient.profissionalId || '_none')
    if (!isAdmin || !user) return

    fetch('/api/terapeutas', {
      headers: {
        'X-User-Data': btoa(JSON.stringify(user)),
        'X-Auth-Token': user.token,
      },
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setProfissionais(result.data)
      })
      .catch(() => {})
  }, [open, isAdmin, user, patient.profissionalId])

  const reatribuirTerapeuta = async () => {
    if (!user) return
    try {
      setReatribuindo(true)
      const novoId = profissionalSelecionado === '_none' ? null : profissionalSelecionado

      const response = await fetch('/api/pacientes', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': btoa(JSON.stringify(user)),
          'X-Auth-Token': user.token,
        },
        body: JSON.stringify({ id: patient.id, profissionalId: novoId }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao reatribuir terapeuta')
      }

      if (onSuccess) onSuccess()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erro ao reatribuir terapeuta')
    } finally {
      setReatribuindo(false)
    }
  }

  // Calcular idade baseada na data de nascimento
  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  }

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
  }

  // Formatar data e hora para exibição
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })
  }

  const formatCPF = (cpf: string) => {
    if (!cpf) return '-'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const age = calculateAge(patient.birthDate)

  const enderecoEstruturado = [
    patient.logradouro && patient.numero ? `${patient.logradouro}, ${patient.numero}` : patient.logradouro,
    patient.complemento,
    patient.bairro,
    patient.cidade && patient.estado ? `${patient.cidade}/${patient.estado}` : patient.cidade,
    patient.cep,
  ]
    .filter(Boolean)
    .join(' - ')

  const enderecoExibicao = enderecoEstruturado || patient.address

  const responsaveis = patient.responsaveis || []
  const convenios = patient.convenios || []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalhes do Paciente
          </DialogTitle>
          <DialogDescription>
            Informações completas do paciente cadastrado no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com Nome e Status */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{patient.name}</h2>
            <div className="flex justify-center gap-2">
              <Badge variant="secondary">{age} anos</Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Ativo
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Seção: Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados Pessoais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">CPF</label>
                <p className="font-mono">{formatCPF(patient.cpf)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p>{formatDate(patient.birthDate)}</p>
                </div>
              </div>

              {patient.sexo && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Sexo</label>
                  <p>{SEXO_LABELS[patient.sexo] || patient.sexo}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Seção: Contato */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Informações de Contato
            </h3>

            <div className="space-y-3">
              {patient.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Telefone:</span>
                  <span>{patient.phone}</span>
                </div>
              )}

              {patient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span>{patient.email}</span>
                </div>
              )}

              {enderecoExibicao && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Endereço:</span>
                    <span className="text-sm">{enderecoExibicao}</span>
                  </div>
                </div>
              )}

              {!patient.phone && !patient.email && !enderecoExibicao && (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma informação de contato cadastrada
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Seção: Responsáveis */}
          {(responsaveis.length > 0 || patient.guardianName || patient.guardianPhone) && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Responsáveis
                </h3>

                {responsaveis.length > 0 ? (
                  <div className="space-y-3">
                    {responsaveis.map((r, i) => (
                      <div key={r.id || i} className="p-3 border rounded-lg bg-muted/30 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{r.nome}</span>
                          <Badge variant="outline" className="text-xs">
                            {PARENTESCO_LABELS[r.parentesco] || r.parentesco}
                          </Badge>
                          {r.financeiro && (
                            <Badge variant="secondary" className="text-xs">Financeiro</Badge>
                          )}
                        </div>
                        {r.telefone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {r.telefone}
                          </div>
                        )}
                        {r.cpf && (
                          <div className="text-sm text-muted-foreground font-mono">
                            CPF: {formatCPF(r.cpf)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patient.guardianName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Responsável Financeiro:</span>
                        <span>{patient.guardianName}</span>
                      </div>
                    )}

                    {patient.guardianPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Contato de Emergência:</span>
                        <span>{patient.guardianPhone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Seção: Convênios */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Convênios / Plano de Saúde
            </h3>

            <div className="space-y-3">
              {convenios.length > 0 ? (
                convenios.map((c, i) => (
                  <div key={c.id || i} className="flex items-center gap-2 flex-wrap">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">
                      {c.convenio?.nome_fantasia || c.convenio?.razao_social || 'Convênio'}
                    </Badge>
                    {c.principal && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                    {c.numero_carteirinha && (
                      <span className="text-sm font-mono text-muted-foreground">
                        Carteirinha: {c.numero_carteirinha}
                      </span>
                    )}
                  </div>
                ))
              ) : patient.convenio ? (
                <>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Convênio:</span>
                    <Badge variant="outline">
                      {patient.convenio.nome_fantasia || patient.convenio.razao_social}
                    </Badge>
                  </div>

                  {patient.healthInsuranceNumber && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Matrícula:</span>
                      <span className="font-mono text-sm">{patient.healthInsuranceNumber}</span>
                    </div>
                  )}
                </>
              ) : patient.healthInsurance ? (
                <>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Plano:</span>
                    <Badge variant="outline">{patient.healthInsurance}</Badge>
                  </div>

                  {patient.healthInsuranceNumber && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Matrícula:</span>
                      <span className="font-mono text-sm">{patient.healthInsuranceNumber}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">Particular</Badge>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Seção: Terapeuta Responsável */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Terapeuta Responsável
            </h3>

            {isAdmin ? (
              <div className="flex items-center gap-2">
                <Select value={profissionalSelecionado} onValueChange={setProfissionalSelecionado}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione o terapeuta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Não atribuído</SelectItem>
                    {profissionais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.especialidade ? `— ${p.especialidade}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={reatribuindo || profissionalSelecionado === (patient.profissionalId || '_none')}
                  onClick={reatribuirTerapeuta}
                >
                  {reatribuindo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            ) : (
              <p className="text-sm">
                {patient.profissional
                  ? `${patient.profissional.nome}${patient.profissional.especialidade ? ` — ${patient.profissional.especialidade}` : ''}`
                  : 'Não atribuído'}
              </p>
            )}
          </div>

          <Separator />

          {/* Seção: Informações do Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações do Sistema</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Cadastrado em</label>
                <p>{formatDateTime(patient.createdAt)}</p>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Última atualização</label>
                <p>{formatDateTime(patient.updatedAt)}</p>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">ID do Sistema</label>
                <p className="font-mono text-xs">{patient.id}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botão para fechar */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
