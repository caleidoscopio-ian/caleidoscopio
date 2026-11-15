'use client'

import { useState } from 'react'

export default function DebugEnvPage() {
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    setTestResult('')

    const managerUrl = process.env.NEXT_PUBLIC_MANAGER_API_URL || 'http://localhost:3000'

    try {
      console.log('🔍 Testando conexão com:', managerUrl)
      console.log('🌍 Origin atual:', window.location.origin)

      const response = await fetch(`${managerUrl}/api/auth/login`, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
        }
      })

      console.log('📡 Response status:', response.status)
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()))

      setTestResult(`✅ Conexão OK! Status: ${response.status}\nHeaders CORS: ${response.headers.get('Access-Control-Allow-Origin') || 'NENHUM'}`)
    } catch (error) {
      console.error('❌ Erro:', error)
      setTestResult(`❌ Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="mb-4">Debug - Environment & Connection</h1>

      <div className="space-y-4">
        <div className="bg-surface-sunken p-4 rounded">
          <p className="mb-2"><strong>NEXT_PUBLIC_MANAGER_API_URL:</strong></p>
          <p className="font-mono bg-surface p-2 rounded break-all">
            {process.env.NEXT_PUBLIC_MANAGER_API_URL || '❌ NÃO DEFINIDA (usando fallback: http://localhost:3000)'}
          </p>
        </div>

        <div className="bg-brand-soft p-4 rounded">
          <p className="mb-2"><strong>Origin deste site:</strong></p>
          <p className="font-mono bg-surface p-2 rounded break-all">
            {typeof window !== 'undefined' ? window.location.origin : 'Carregando...'}
          </p>
        </div>

        <div className="bg-violet-soft p-4 rounded">
          <p className="mb-2"><strong>Teste de Conexão CORS:</strong></p>
          <button
            onClick={testConnection}
            disabled={isLoading}
            className="bg-violet text-white px-4 py-2 rounded hover:bg-violet disabled:bg-surface-muted"
          >
            {isLoading ? 'Testando...' : 'Testar Conexão com Manager'}
          </button>

          {testResult && (
            <pre className="mt-4 bg-surface p-4 rounded border text-sm whitespace-pre-wrap">
              {testResult}
            </pre>
          )}
        </div>

        <div className="bg-warning-soft border border-warning-soft p-4 rounded">
          <p className="text-sm text-warning-ink">
            <strong>⚠️ Para CORS funcionar:</strong>
            <br/>1. Sistema Manager precisa ter <code className="bg-warning-soft px-1">EDUCATIONAL_SYSTEM_URL</code> = <code className="bg-warning-soft px-1">{typeof window !== 'undefined' ? window.location.origin : ''}</code> (SEM barra no final)
            <br/>2. Ambos os sistemas precisam fazer redeploy após mudanças
            <br/>3. Verifique console do navegador (F12) para mais detalhes
          </p>
        </div>
      </div>
    </div>
  )
}
