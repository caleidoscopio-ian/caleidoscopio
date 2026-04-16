import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Textarea } from './textarea';
import { Label } from './label';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: { placeholder: 'Digite suas observações...' },
};

export const ComLabel: Story = {
  render: () => (
    <div className="grid gap-1.5 w-[380px]">
      <Label htmlFor="obs">Observações da Sessão</Label>
      <Textarea id="obs" placeholder="Descreva o comportamento do paciente durante a sessão..." />
    </div>
  ),
};

export const Desabilitado: Story = {
  args: { placeholder: 'Campo somente leitura', disabled: true },
};

export const PrePreenchido: Story = {
  name: 'Pré-preenchido',
  args: {
    defaultValue: 'Paciente demonstrou boa resposta às instruções. Acertos acima de 80% nas tentativas de identificação de cores. Manteve atenção por aproximadamente 20 minutos.',
  },
};

export const Anamnese: Story = {
  name: 'Campos de Anamnese',
  render: () => (
    <div className="space-y-4 w-[460px]">
      <div className="grid gap-1.5">
        <Label htmlFor="hist">Histórico do Desenvolvimento</Label>
        <Textarea id="hist" placeholder="Descreva o histórico de desenvolvimento do paciente..." />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="queixa">Queixa Principal</Label>
        <Textarea id="queixa" placeholder="Descreva a queixa principal da família..." />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="interv">Intervenções Anteriores</Label>
        <Textarea id="interv" placeholder="Fonoaudiologia, Terapia Ocupacional, ABA..." />
      </div>
    </div>
  ),
};
