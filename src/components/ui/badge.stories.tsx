import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: 'Ativo' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Linha de Base' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Inativo' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Rascunho' },
};

export const FasesBadges: Story = {
  name: 'Fases do Curriculum',
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">Linha de Base</Badge>
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Ensino</Badge>
      <Badge className="bg-green-100 text-green-800 border-green-200">Manutenção</Badge>
      <Badge className="bg-purple-100 text-purple-800 border-purple-200">Generalização</Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  name: 'Status da Sessão',
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-green-100 text-green-800">Finalizada</Badge>
      <Badge className="bg-yellow-100 text-yellow-800">Em Andamento</Badge>
      <Badge className="bg-red-100 text-red-800">Cancelada</Badge>
      <Badge variant="outline">Pendente</Badge>
    </div>
  ),
};
