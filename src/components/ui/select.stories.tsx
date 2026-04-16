import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from './select';
import { Label } from './label';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Selecionar..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="joao">João Silva</SelectItem>
        <SelectItem value="lucas">Lucas Ferreira</SelectItem>
        <SelectItem value="sofia">Sofia Oliveira</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const ComLabelSelect: Story = {
  name: 'Com Label',
  render: () => (
    <div className="grid gap-1.5 w-[240px]">
      <Label>Paciente</Label>
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Selecionar paciente..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="joao">João Silva</SelectItem>
          <SelectItem value="lucas">Lucas Ferreira</SelectItem>
          <SelectItem value="sofia">Sofia Oliveira</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const ComGrupos: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Selecionar fase..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fases do Curriculum</SelectLabel>
          <SelectItem value="linha-base">Linha de Base</SelectItem>
          <SelectItem value="intervencao">Intervenção</SelectItem>
          <SelectItem value="manutencao">Manutenção</SelectItem>
          <SelectItem value="generalizacao">Generalização</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-[240px]">
        <SelectValue placeholder="Campo desabilitado" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="item">Item</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Selects: Story = {
  name: 'Uso em Formulário',
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div className="grid gap-1.5">
        <Label>Terapeuta</Label>
        <Select>
          <SelectTrigger><SelectValue placeholder="Selecionar terapeuta..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ana">Ana Lima</SelectItem>
            <SelectItem value="bruno">Bruno Santos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Sala</Label>
        <Select>
          <SelectTrigger><SelectValue placeholder="Selecionar sala..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="azul">Sala Azul</SelectItem>
            <SelectItem value="verde">Sala Verde</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Tipo de Sessão</Label>
        <Select>
          <SelectTrigger><SelectValue placeholder="Selecionar tipo..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Sessão Individual</SelectItem>
            <SelectItem value="grupo">Sessão em Grupo</SelectItem>
            <SelectItem value="avaliacao">Avaliação</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};
