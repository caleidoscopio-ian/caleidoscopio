// E-mail é sempre gravado em minúsculas e sem espaços nas pontas — o mesmo
// formato que o Manager (Sistema 1) usa para o e-mail de login.
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Versão que aceita vazio/ausente: devolve null quando não há e-mail.
export function normalizarEmailOpcional(email: unknown): string | null {
  if (typeof email !== "string") return null;
  return normalizarEmail(email) || null;
}
