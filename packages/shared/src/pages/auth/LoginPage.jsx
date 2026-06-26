import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { appUrls } from '../../lib/appUrls'

// Login compartilhado, parametrizado por app:
// - allowedRoles: papéis que este app aceita
// - redirectTo: rota interna de destino após login
// - registerPath: rota de cadastro (só o app de treino passa '/register')
export function LoginPage({ allowedRoles = [], redirectTo = '/', registerPath = null }) {
  const { signIn } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      show('E-mail ou senha incorretos.', 'error')
      return
    }

    const role = data?.user?.user_metadata?.role || 'user'
    if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
      navigate(redirectTo, { replace: true })
      return
    }

    // Papel não pertence a este app — encaminha para o app correto.
    const dest = role === 'user' ? appUrls.treino : appUrls.agenda
    show('Esta conta não pertence a este aplicativo. Redirecionando...', 'info', 4000)
    window.location.href = dest
  }

  return (
    <>
      <h2 className="text-lg font-bold text-gray-800 mb-6 text-center">Entrar na sua conta</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Sua senha"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm uppercase tracking-wider hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Entrando...
            </>
          ) : 'Entrar'}
        </button>
      </form>
      {registerPath && (
        <div className="mt-5 text-center text-sm text-gray-500">
          Ainda não tem conta?{' '}
          <Link to={registerPath} className="text-primary font-semibold hover:underline">
            Criar conta
          </Link>
        </div>
      )}
    </>
  )
}
