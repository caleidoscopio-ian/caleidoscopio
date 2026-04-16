import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './button';
import { Loader2, Plus, Trash2, Search } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: 'Salvar' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Excluir' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Cancelar' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Rascunho' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ver mais' },
};

export const Link: Story = {
  args: { variant: 'link', children: 'Saiba mais' },
};

export const Small: Story = {
  args: { size: 'sm', children: 'Pequeno' },
};

export const Large: Story = {
  args: { size: 'lg', children: 'Grande' },
};

export const Icon: Story = {
  args: { size: 'icon', children: <Plus /> },
};

export const WithIcon: Story = {
  args: { children: <><Plus /> Nova Atividade</> },
};

export const Loading: Story = {
  args: {
    disabled: true,
    children: <><Loader2 className="animate-spin" /> Salvando...</>,
  },
};

export const DestructiveWithIcon: Story = {
  args: {
    variant: 'destructive',
    children: <><Trash2 /> Remover</>,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Pequeno</Button>
      <Button size="default">Normal</Button>
      <Button size="lg">Grande</Button>
      <Button size="icon"><Search /></Button>
    </div>
  ),
};
