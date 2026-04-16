import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  render: () => (
    <Alert>
      <Info />
      <AlertTitle>Informação</AlertTitle>
      <AlertDescription>Esta sessão possui 3 instruções selecionadas.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Erro</AlertTitle>
      <AlertDescription>Não foi possível finalizar a sessão. Verifique se todas as avaliações foram preenchidas.</AlertDescription>
    </Alert>
  ),
};

export const Success: Story = {
  render: () => (
    <Alert className="border-green-200 bg-green-50 text-green-800">
      <CheckCircle2 className="text-green-600" />
      <AlertTitle>Sessão finalizada</AlertTitle>
      <AlertDescription>A sessão foi finalizada com sucesso. 2 instruções avançaram de fase.</AlertDescription>
    </Alert>
  ),
};
