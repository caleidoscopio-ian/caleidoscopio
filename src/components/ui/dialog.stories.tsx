import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Button } from './button';
import { Badge } from './badge';

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Abrir Modal</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Detalhes da Sessão</DialogTitle>
          <DialogDescription>Informações detalhadas da sessão de curriculum.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">Conteúdo do modal aqui.</p>
        </div>
        <DialogFooter>
          <Button>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Confirmacao: Story = {
  name: 'Confirmação de Ação',
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Excluir Atividade</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancelar</Button>
          <Button variant="destructive">Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const DetalhesSessao: Story = {
  name: 'Detalhes de Sessão Curriculum',
  render: () => (
    <Dialog defaultOpen>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Sessão Curriculum — Detalhes</DialogTitle>
          <DialogDescription>22/03/2026 às 14:30 — Finalizada</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Instruções Avaliadas</h4>
            <div className="space-y-2">
              {['Tocar no azul', 'Tocar no vermelho', 'Tocar no rosa'].map((instrucao, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-sm">{instrucao}</span>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">Linha de Base</Badge>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2">Resumo</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Acertos:</span><span className="font-medium">80%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avanços:</span><span className="font-medium">1</span></div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  ),
};
