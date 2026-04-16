import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Switch } from './switch';
import { Label } from './label';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: {},
};

export const Ativo: Story = {
  args: { defaultChecked: true },
};

export const Desabilitado: Story = {
  args: { disabled: true },
};

export const ComLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="notif" />
      <Label htmlFor="notif">Receber notificações</Label>
    </div>
  ),
};

export const ConfiguracoesSistema: Story = {
  name: 'Configurações do Sistema',
  render: () => {
    const configs = [
      { id: 'cert', label: 'Habilitar Certificados', checked: true },
      { id: 'live', label: 'Aulas ao Vivo', checked: false },
      { id: 'notif', label: 'Notificações por Email', checked: true },
      { id: 'agenda', label: 'Confirmação de Agenda', checked: false },
    ];
    return (
      <div className="space-y-4 w-[300px]">
        {configs.map(c => (
          <div key={c.id} className="flex items-center justify-between">
            <Label htmlFor={c.id} className="cursor-pointer">{c.label}</Label>
            <Switch id={c.id} defaultChecked={c.checked} />
          </div>
        ))}
      </div>
    );
  },
};
