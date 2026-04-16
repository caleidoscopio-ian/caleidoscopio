import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from './input';
import { Label } from './label';
import { Search } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'date'],
    },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Digite aqui...' },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="nome">Nome do Paciente</Label>
      <Input id="nome" placeholder="Ex: João Silva" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { placeholder: 'Campo desabilitado', disabled: true },
};

export const Number: Story = {
  args: { type: 'number', placeholder: 'Tentativas', min: 1, max: 50 },
};

export const Date: Story = {
  args: { type: 'date' },
};

export const SearchInput: Story = {
  name: 'Busca',
  render: () => (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input className="pl-9" placeholder="Buscar paciente..." />
    </div>
  ),
};

export const FormGroup: Story = {
  name: 'Grupo de Formulário',
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <div className="grid gap-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" placeholder="Nome completo" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="email@exemplo.com" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tentativas">Tentativas</Label>
        <Input id="tentativas" type="number" min={1} max={50} defaultValue={1} />
      </div>
    </div>
  ),
};
