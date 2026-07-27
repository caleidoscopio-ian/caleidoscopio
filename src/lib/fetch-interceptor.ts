// Interceptor global de fetch — detecta 401 em qualquer chamada às APIs do
// próprio Sistema 2 (relativa, "/api/..."), venha ela do apiCall (src/lib/api.ts)
// ou de um fetch() cru direto num componente (padrão usado na maioria dos
// formulários hoje). Centraliza a reação a sessão expirada num único lugar,
// evitando a corrida entre redirecionamentos concorrentes (ex.: /login vs.
// /sem-permissao) que acontecia quando cada chamada tratava o 401 por conta própria.

let installed = false;
let handling401 = false;

function isOwnApiRequest(input: RequestInfo | URL): boolean {
  const url = typeof input === "string"
    ? input
    : input instanceof Request
      ? input.url
      : input.toString();

  // Só nos interessa /api/... do próprio Sistema 2 — nunca chamadas absolutas
  // pro Sistema 1 (Manager), que tem seu próprio ciclo de vida de erro 401
  // (ex.: senha incorreta no login não deve disparar "sessão expirada").
  if (url.startsWith("/api/")) return !url.startsWith("/api/auth/");
  if (typeof window !== "undefined" && url.startsWith(window.location.origin + "/api/")) {
    return !url.includes("/api/auth/");
  }
  return false;
}

export function installFetchInterceptor(onUnauthorized: () => void) {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);

    if (response.status === 401 && isOwnApiRequest(args[0]) && !handling401) {
      handling401 = true;
      onUnauthorized();
      // Libera o guard logo depois — evita apenas o "storm" de disparos
      // simultâneos quando várias chamadas 401am ao mesmo tempo.
      setTimeout(() => {
        handling401 = false;
      }, 3000);
    }

    return response;
  };
}
