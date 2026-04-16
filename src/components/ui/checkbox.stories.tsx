import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Checkbox } from './checkbox';
import { Label } from './label';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const Marcado: Story = {
  args: { defaultChecked: true },
};

export const Desabilitado: Story = {
  args: { disabled: true },
};

export const ComLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="confirma" />
      <Label htmlFor="confirma">Confirmar sessão</Label>
    </div>
  ),
};

export const MatrizPermissoes: Story = {
  name: 'Matriz de Permissões',
  render: () => {
    const acoes = ['Ver', 'Criar', 'Editar', 'Excluir'];
    const recursos = ['Pacientes', 'Agenda', 'Relatórios'];
    return (
      <div className="overflow-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="text-left pr-6 pb-2 font-medium">Recurso</th>
              {acoes.map(a => (
                <th key={a} className="px-4 pb-2 font-medium text-center">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {recursos.map(r => (
              <tr key={r}>
                <td className="py-2 pr-6">{r}</td>
                {acoes.map((a, i) => (
                  <td key={a} className="px-4 py-2 text-center">
                    <Checkbox defaultChecked={i < 2} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
};

export const FiltroInstrucoes: Story = {
  name: 'Seleção de Instruções',
  render: () => {
    const instrucoes = [
      { id: 'i1', texto: 'Tocar no azul', selecionada: true },
      { id: 'i2', texto: 'Tocar no vermelho', selecionada: true },
      { id: 'i3', texto: 'Tocar no rosa', selecionada: false },
      { id: 'i4', texto: 'Tocar no verde', selecionada: false },
    ];
    return (
      <div className="space-y-3 w-[280px]">
        <p className="text-sm font-medium">Selecionar instruções para a sessão:</p>
        {instrucoes.map(i => (
          <div key={i.id} className="flex items-center gap-2">
            <Checkbox id={i.id} defaultChecked={i.selecionada} />
            <Label htmlFor={i.id} className="cursor-pointer">{i.texto}</Label>
          </div>
        ))}
      </div>
    );
  },
};
