'use client'

export default function DebugEnvPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug - Environment Variables</h1>
      <div className="bg-gray-100 p-4 rounded">
        <p className="mb-2"><strong>NEXT_PUBLIC_MANAGER_API_URL:</strong></p>
        <p className="font-mono bg-white p-2 rounded">
          {process.env.NEXT_PUBLIC_MANAGER_API_URL || '❌ NÃO DEFINIDA (usando fallback: http://localhost:3000)'}
        </p>
      </div>
      <div className="mt-4 bg-yellow-50 border border-yellow-200 p-4 rounded">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Importante:</strong> Se aparecer "NÃO DEFINIDA", você precisa:
          <br/>1. Definir a variável no seu ambiente de produção
          <br/>2. Fazer rebuild do projeto
          <br/>3. Fazer redeploy
        </p>
      </div>
    </div>
  )
}
