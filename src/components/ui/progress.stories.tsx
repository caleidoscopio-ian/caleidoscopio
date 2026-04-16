import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Progress } from './progress';

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 }, description: 'Valor (0-100)' },
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: { value: 60 },
  render: (args) => <Progress {...args} className="w-[300px]" />,
};

export const Vazio: Story = {
  args: { value: 0 },
  render: (args) => <Progress {...args} className="w-[300px]" />,
};

export const Completo: Story = {
  args: { value: 100 },
  render: (args) => <Progress {...args} className="w-[300px]" />,
};

export const ProgressoDeSessao: Story = {
  name: 'Progresso de Sessão',
  render: () => (
    <div className="space-y-4 w-[380px]">
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span>Instruções avaliadas</span>
          <span className="font-medium">3/5</span>
        </div>
        <Progress value={60} />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span>Acertos</span>
          <span className="font-medium text-green-600">80%</span>
        </div>
        <Progress value={80} className="[&>div]:bg-green-500" />
      </div>
      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span>Erros</span>
          <span className="font-medium text-red-600">20%</span>
        </div>
        <Progress value={20} className="[&>div]:bg-red-500" />
      </div>
    </div>
  ),
};

export const DistribuicaoPontuacoes: Story = {
  name: 'Distribuição de Pontuações',
  render: () => {
    const pontuacoes = [
      { sigla: '+', label: 'Acerto', valor: 65, cor: 'bg-green-500' },
      { sigla: 'AFP', label: 'Ajuda Física Parcial', valor: 20, cor: 'bg-yellow-500' },
      { sigla: 'AFT', label: 'Ajuda Física Total', valor: 10, cor: 'bg-orange-500' },
      { sigla: '-', label: 'Erro', valor: 5, cor: 'bg-red-500' },
    ];
    return (
      <div className="space-y-3 w-[380px]">
        {pontuacoes.map(p => (
          <div key={p.sigla}>
            <div className="flex justify-between text-sm mb-1">
              <span><strong>{p.sigla}</strong> — {p.label}</span>
              <span className="font-medium">{p.valor}%</span>
            </div>
            <Progress value={p.valor} className={`[&>div]:${p.cor}`} />
          </div>
        ))}
      </div>
    );
  },
};
