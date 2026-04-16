import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const ComFallback: Story = {
  name: 'Com Iniciais (Fallback)',
  render: () => (
    <Avatar>
      <AvatarFallback>JS</AvatarFallback>
    </Avatar>
  ),
};

export const ComImagem: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="Avatar" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
};

export const Tamanhos: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar className="size-6">
        <AvatarFallback className="text-xs">JS</AvatarFallback>
      </Avatar>
      <Avatar className="size-8">
        <AvatarFallback className="text-sm">JS</AvatarFallback>
      </Avatar>
      <Avatar className="size-10">
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>
      <Avatar className="size-12">
        <AvatarFallback className="text-lg">JS</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const GrupoPacientes: Story = {
  name: 'Lista de Pacientes',
  render: () => {
    const pacientes = [
      { iniciais: 'JS', nome: 'João Silva', cor: '#3B82F6', status: 'Ativo' },
      { iniciais: 'LF', nome: 'Lucas Ferreira', cor: '#10B981', status: 'Ativo' },
      { iniciais: 'SO', nome: 'Sofia Oliveira', cor: '#F59E0B', status: 'Inativo' },
    ];
    return (
      <div className="space-y-3">
        {pacientes.map(p => (
          <div key={p.nome} className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback style={{ backgroundColor: p.cor, color: 'white' }}>
                {p.iniciais}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{p.nome}</p>
            </div>
            <Badge variant={p.status === 'Ativo' ? 'default' : 'secondary'}>
              {p.status}
            </Badge>
          </div>
        ))}
      </div>
    );
  },
};

export const GrupoSessao: Story = {
  name: 'Terapeuta + Paciente na Agenda',
  render: () => (
    <div className="flex items-center gap-2 rounded-lg border p-3 w-[260px]">
      <div className="relative">
        <Avatar className="size-9">
          <AvatarFallback className="bg-blue-500 text-white text-sm">JS</AvatarFallback>
        </Avatar>
        <Avatar className="size-5 absolute -bottom-1 -right-1 border-2 border-white">
          <AvatarFallback className="bg-gray-500 text-white text-[9px]">AL</AvatarFallback>
        </Avatar>
      </div>
      <div className="ml-1">
        <p className="text-sm font-medium">João Silva</p>
        <p className="text-xs text-muted-foreground">Ana Lima · 09:00–10:00</p>
      </div>
    </div>
  ),
};
