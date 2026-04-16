import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FaseBadge } from './fase-badge';

const meta: Meta<typeof FaseBadge> = {
  title: 'Composições/FaseBadge',
  component: FaseBadge,
  tags: ['autodocs'],
  argTypes: {
    fase: {
      control: 'select',
      options: ['LINHA_BASE', 'INTERVENCAO', 'MANUTENCAO', 'GENERALIZACAO'],
      description: 'Fase do curriculum ABA',
    },
    size: {
      control: 'radio',
      options: ['sm', 'default'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof FaseBadge>;

export const LinhaBase: Story = {
  args: { fase: 'LINHA_BASE' },
};

export const Intervencao: Story = {
  name: 'Intervenção',
  args: { fase: 'INTERVENCAO' },
};

export const Manutencao: Story = {
  name: 'Manutenção',
  args: { fase: 'MANUTENCAO' },
};

export const Generalizacao: Story = {
  name: 'Generalização',
  args: { fase: 'GENERALIZACAO' },
};

export const FaseDesconhecida: Story = {
  name: 'Fase Desconhecida (Fallback)',
  args: { fase: 'FASE_INEXISTENTE' },
};

export const TodasAsFases: Story = {
  name: 'Todas as Fases',
  render: () => (
    <div className="flex flex-wrap gap-2">
      {['LINHA_BASE', 'INTERVENCAO', 'MANUTENCAO', 'GENERALIZACAO'].map(fase => (
        <FaseBadge key={fase} fase={fase} />
      ))}
    </div>
  ),
};

export const TodasAsFasesPequenas: Story = {
  name: 'Todas as Fases (Pequeno)',
  render: () => (
    <div className="flex flex-wrap gap-2">
      {['LINHA_BASE', 'INTERVENCAO', 'MANUTENCAO', 'GENERALIZACAO'].map(fase => (
        <FaseBadge key={fase} fase={fase} size="sm" />
      ))}
    </div>
  ),
};

export const EmContextoDeInstrucao: Story = {
  name: 'Em Contexto de Instrução',
  render: () => (
    <div className="space-y-2 w-[380px]">
      {[
        { texto: 'Tocar no azul', fase: 'LINHA_BASE' },
        { texto: 'Tocar no vermelho', fase: 'INTERVENCAO' },
        { texto: 'Nomear a cor azul', fase: 'MANUTENCAO' },
        { texto: 'Identificar cores no ambiente', fase: 'GENERALIZACAO' },
      ].map(i => (
        <div key={i.texto} className="flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-sm">{i.texto}</span>
          <FaseBadge fase={i.fase} size="sm" />
        </div>
      ))}
    </div>
  ),
};
