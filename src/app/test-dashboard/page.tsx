'use client'

export default function TestDashboard() {
  return (
    <div className="min-h-screen bg-success-soft flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-success-ink mb-4">
          🎉 Redirecionamento Funcionou!
        </h1>
        <p className="text-success-ink">
          Se você está vendo esta página, o login e redirecionamento estão funcionando.
        </p>
        <div className="mt-6">
          <a
            href="/dashboard"
            className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand"
          >
            Ir para Dashboard Real
          </a>
        </div>
      </div>
    </div>
  )
}