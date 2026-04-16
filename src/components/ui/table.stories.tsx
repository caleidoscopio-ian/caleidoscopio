import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Table, TableBody, TableCaption, TableCell,
  TableHead, TableHeader, TableRow,
} from './table';
import { Badge } from './badge';
import { Button } from './button';
import { Avatar, AvatarFallback } from './avatar';
import { Eye } from 'lucide-react';

const meta: Meta<typeof Table> = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Table>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Lista de pacientes</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Diagnóstico</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>João Silva</TableCell>
          <TableCell>TEA Nível 2</TableCell>
          <TableCell><Badge>Ativo</Badge></TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Lucas Ferreira</TableCell>
          <TableCell>TEA Nível 1</TableCell>
          <TableCell><Badge>Ativo</Badge></TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Sofia Oliveira</TableCell>
          <TableCell>TEA Nível 1</TableCell>
          <TableCell><Badge variant="secondary">Inativo</Badge></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const TabelaPacientes: Story = {
  name: 'Tabela de Pacientes',
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Paciente</TableHead>
          <TableHead>Responsável</TableHead>
          <TableHead>Terapeuta</TableHead>
          <TableHead>Próxima Sessão</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[
          { iniciais: 'JS', nome: 'João Silva', resp: 'Maria Silva', terapeuta: 'Ana Lima', proxima: '22/03 09:00', cor: '#3B82F6' },
          { iniciais: 'LF', nome: 'Lucas Ferreira', resp: 'Roberto Ferreira', terapeuta: 'Bruno Santos', proxima: '22/03 10:30', cor: '#10B981' },
          { iniciais: 'SO', nome: 'Sofia Oliveira', resp: 'Carla Oliveira', terapeuta: 'Ana Lima', proxima: '23/03 14:00', cor: '#F59E0B' },
        ].map(p => (
          <TableRow key={p.nome}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarFallback style={{ backgroundColor: p.cor, color: 'white' }} className="text-xs">
                    {p.iniciais}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{p.nome}</span>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{p.resp}</TableCell>
            <TableCell>{p.terapeuta}</TableCell>
            <TableCell>{p.proxima}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" className="size-7">
                <Eye />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const TabelaSessoes: Story = {
  name: 'Tabela de Sessões',
  render: () => {
    const statusMap: Record<string, string> = {
      Finalizada: 'bg-green-100 text-green-800',
      Pendente: 'bg-yellow-100 text-yellow-800',
      Cancelada: 'bg-red-100 text-red-800',
    };
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            { data: '22/03 09:00', paciente: 'João Silva', tipo: 'Curriculum', status: 'Finalizada' },
            { data: '22/03 10:30', paciente: 'Lucas Ferreira', tipo: 'Avaliação', status: 'Pendente' },
            { data: '21/03 14:00', paciente: 'Sofia Oliveira', tipo: 'Curriculum', status: 'Cancelada' },
          ].map((s, i) => (
            <TableRow key={i}>
              <TableCell className="text-muted-foreground">{s.data}</TableCell>
              <TableCell className="font-medium">{s.paciente}</TableCell>
              <TableCell>{s.tipo}</TableCell>
              <TableCell>
                <Badge className={statusMap[s.status]}>{s.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">Ver</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  },
};

export const TabelaVazia: Story = {
  name: 'Estado Vazio',
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Paciente</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
            Nenhum registro encontrado.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
