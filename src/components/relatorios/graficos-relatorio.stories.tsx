import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { GraficosRelatorio } from './graficos-relatorio';

const meta: Meta<typeof GraficosRelatorio> = {
  title: 'Composições/GraficosRelatorio',
  component: GraficosRelatorio,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof GraficosRelatorio>;

export const DistribuicaoCompleta: Story = {
  name: 'Distribuição Completa',
  args: {
    distribuicao: {
      curriculum: 89,
      atividade: 42,
      avaliacao: 18,
      agendamento: 23,
    },
  },
};

export const SoCurriculum: Story = {
  name: 'Somente Curriculum',
  args: {
    distribuicao: {
      curriculum: 60,
      atividade: 0,
      avaliacao: 0,
      agendamento: 0,
    },
  },
};

export const SemDados: Story = {
  name: 'Sem Dados (Oculta Componente)',
  args: {
    distribuicao: {
      curriculum: 0,
      atividade: 0,
      avaliacao: 0,
      agendamento: 0,
    },
  },
};
