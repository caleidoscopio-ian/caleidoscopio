'use client'

export default function TestDashboard() {
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-800 mb-4">
          🎉 Redirecionamento Funcionou!
        </h1>
        <p className="text-green-600">
          Se você está vendo esta página, o login e redirecionamento estão funcionando.
        </p>
        <div className="mt-6">
          <a
            href="/dashboard"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Ir para Dashboard Real
          </a>
        </div>
      </div>
    </div>
  )
}