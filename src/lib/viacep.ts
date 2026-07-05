// Consulta de endereço por CEP via ViaCEP (client-side)

export interface EnderecoViaCep {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export async function buscarEnderecoPorCep(
  cep: string
): Promise<EnderecoViaCep | null> {
  const numeros = cep.replace(/\D/g, "");
  if (numeros.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${numeros}/json/`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.erro) return null;

    return {
      logradouro: data.logradouro || "",
      bairro: data.bairro || "",
      localidade: data.localidade || "",
      uf: data.uf || "",
    };
  } catch {
    return null;
  }
}
