// Política de renovação do token SSO.
//
// O Sistema 1 emite o token com validade de 2 horas (expiresIn: 7200) e o
// interceptor de 401 desloga na hora. Então a renovação precisa acontecer com
// folga confortável antes da expiração — renovar exatamente no vencimento é
// corrida perdida: basta latência, relógio adiantado ou o navegador estrangular
// o timer de uma aba em segundo plano para o token morrer antes.

const CHAVE_EXPIRACAO = "edu_token_expira_em";

/** Renova quando 75% da vida do token já passou */
export const PROPORCAO_RENOVACAO = 0.75;

/** Usado quando o Sistema 1 não informa expiresIn */
export const INTERVALO_PADRAO_MS = 60 * 60 * 1000; // 1 hora

/** Piso e teto para o agendamento, independentemente do que vier do servidor */
export const INTERVALO_MIN_MS = 5 * 60 * 1000; // 5 minutos
export const INTERVALO_MAX_MS = 60 * 60 * 1000; // 1 hora

/** Ao reativar a aba, renova se faltar menos que isso para expirar */
export const MARGEM_AO_FOCAR_MS = 15 * 60 * 1000; // 15 minutos

/** Guarda quando o token atual expira, a partir do expiresIn (em segundos) */
export function registrarExpiracao(expiresInSegundos?: number | null): void {
  try {
    if (!expiresInSegundos || !Number.isFinite(expiresInSegundos)) {
      localStorage.removeItem(CHAVE_EXPIRACAO);
      return;
    }
    localStorage.setItem(
      CHAVE_EXPIRACAO,
      String(Date.now() + expiresInSegundos * 1000)
    );
  } catch {
    // localStorage indisponível (aba anônima, storage bloqueado): o
    // agendamento cai no intervalo padrão, que é seguro
  }
}

export function limparExpiracao(): void {
  try {
    localStorage.removeItem(CHAVE_EXPIRACAO);
  } catch {
    // sem storage não há o que limpar
  }
}

/** Milissegundos restantes do token, ou null se a expiração não é conhecida */
export function restanteMs(agora: number = Date.now()): number | null {
  try {
    const bruto = localStorage.getItem(CHAVE_EXPIRACAO);
    if (!bruto) return null;
    const expiraEm = Number(bruto);
    if (!Number.isFinite(expiraEm)) return null;
    return expiraEm - agora;
  } catch {
    return null;
  }
}

/**
 * Daqui a quanto tempo renovar.
 * Com a expiração conhecida, usa 75% da vida restante; sem ela, o padrão de
 * 1 hora. Sempre limitado entre 5 minutos e 1 hora — o piso evita um laço de
 * renovações quando o token já está vencendo, e o teto garante margem mesmo se
 * o Sistema 1 passar a emitir tokens mais longos.
 */
export function proximoIntervaloMs(restante: number | null): number {
  if (restante === null) return INTERVALO_PADRAO_MS;
  const alvo = restante * PROPORCAO_RENOVACAO;
  return Math.min(Math.max(alvo, INTERVALO_MIN_MS), INTERVALO_MAX_MS);
}

/** true se, ao reativar a aba, o token está perto demais do fim (ou já venceu) */
export function precisaRenovarAoFocar(restante: number | null): boolean {
  if (restante === null) return true; // sem saber, renova por precaução
  return restante <= MARGEM_AO_FOCAR_MS;
}
