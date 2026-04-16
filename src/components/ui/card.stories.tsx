import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';
import { Badge } from './badge';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Paciente</CardTitle>
        <CardDescription>Informações do paciente</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Conteúdo do card aqui.</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Nova Atividade</CardTitle>
        <CardDescription>Preencha os dados da atividade clínica</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Formulário aqui...</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancelar</Button>
        <Button>Salvar</Button>
      </CardFooter>
    </Card>
  ),
};

export const SessaoCard: Story = {
  name: 'Card de Sessão',
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sessão Curriculum</span>
          <Badge className="bg-green-100 text-green-800">Finalizada</Badge>
        </CardTitle>
        <CardDescription>22/03/2026 - 14:30</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Instruções avaliadas:</span>
            <span className="font-medium">5</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Acertos:</span>
            <span className="font-medium text-green-600">80%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avanços de fase:</span>
            <span className="font-medium text-blue-600">2</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">Ver Detalhes</Button>
      </CardFooter>
    </Card>
  ),
};
