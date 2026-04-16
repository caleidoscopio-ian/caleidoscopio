import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResumoCards } from './resumo-cards';

const meta: Meta<typeof ResumoCards> = {
  title: 'Composições/ResumoCards',
  component: ResumoCards,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ResumoCards>;

export const ComDados: Story = {
  args: {
    resumo: {
      totalSessoes: 172,
      sessoesFinalizadas: 147,
      pacientesUnicos: 32,
      taxaConclusao: 94,
      horasTotais: 215,
    },
  },
};

export const ResultadosBaixos: Story = {
  args: {
    resumo: {
      totalSessoes: 30,
      sessoesFinalizadas: 18,
      pacientesUnicos: 8,
      taxaConclusao: 55,
      horasTotais: 24,
    },
  },
};

export const SemDados: Story = {
  name: 'Período Sem Dados',
  args: {
    resumo: {
      totalSessoes: 0,
      sessoesFinalizadas: 0,
      pacientesUnicos: 0,
      taxaConclusao: 0,
      horasTotais: 0,
    },
  },
};
