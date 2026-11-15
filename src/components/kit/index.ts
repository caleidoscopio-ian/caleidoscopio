// Kit do design v2 (Módulo 28).
//
// Importar daqui, não dos arquivos: `import { Panel, StatCard } from "@/components/kit"`.
//
// Convive com `@/components/ui` (shadcn), que continua servindo formulário,
// diálogo e tabela e herda a paleta pelos aliases de token. O kit é a camada
// de identidade visual: o que no v2 tem forma própria (pílula, painel de raio
// grande, KPI em gradiente, avatar por hash).

export { ActionButton, IconButton, type ActionButtonProps } from "./action-button";
export { StatusPill, FasePill, tomDoStatus, type TomStatus } from "./status-pill";
export {
  Panel,
  StatCard,
  IconTile,
  TONS_FILEIRA,
  type TomKpi,
  type TomTile,
} from "./panel";
export { PersonAvatar, SearchField, Segmented, iniciaisDe } from "./pessoa-avatar";
export { PageHeader } from "./page-header";
export {
  SecaoInfo,
  GradeCampos,
  CampoInfo,
  LinhaDado,
  NumeroOrdem,
  EstadoVazio,
  Carregando,
} from "./dados";
export { Trilha, ProvedorTrilha, useTrilha, type Migalha } from "./trilha";
export {
  ProvedorMovimento,
  MarcadorDeslizante,
  IconeAnimado,
  TransicaoDePagina,
  ESTADOS,
  MOLA_MARCADOR,
  MOLA_TOQUE,
  CURVA_ROTA,
} from "./movimento";
