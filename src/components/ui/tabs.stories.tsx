import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import { Badge } from './badge';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="geral" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="geral">Geral</TabsTrigger>
        <TabsTrigger value="instrucoes">Instruções</TabsTrigger>
        <TabsTrigger value="evolucao">Evolução</TabsTrigger>
      </TabsList>
      <TabsContent value="geral">
        <p className="text-sm text-muted-foreground p-4">Configurações gerais da atividade.</p>
      </TabsContent>
      <TabsContent value="instrucoes">
        <p className="text-sm text-muted-foreground p-4">Lista de instruções.</p>
      </TabsContent>
      <TabsContent value="evolucao">
        <p className="text-sm text-muted-foreground p-4">Critérios de evolução de fase.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const EvolucaoInstrucao: Story = {
  name: 'Evolução por Instrução',
  render: () => (
    <Tabs defaultValue="evolucao" className="w-[500px]">
      <TabsList>
        <TabsTrigger value="evolucao">Evolução</TabsTrigger>
        <TabsTrigger value="pontuacao">Pontuação</TabsTrigger>
      </TabsList>
      <TabsContent value="evolucao" className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Fase Atual</span>
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">Linha de Base</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Tentativas</span>
          <span className="text-sm">3</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Critério de avanço</span>
          <span className="text-sm">80% em 3 sessões consecutivas</span>
        </div>
      </TabsContent>
      <TabsContent value="pontuacao" className="space-y-2 p-4">
        <div className="flex gap-2">
          <Badge variant="outline">-</Badge>
          <Badge variant="outline">AFT</Badge>
          <Badge variant="outline">AFP</Badge>
          <Badge variant="outline">+</Badge>
        </div>
      </TabsContent>
    </Tabs>
  ),
};
