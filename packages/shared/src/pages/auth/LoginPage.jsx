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
      <h2 className="text-lg font-bold text-content mb-6 text-center">Entrar na sua conta</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">E-mail</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
            className="emf-input"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">Senha</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Sua senha"
            className="emf-input"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="emf-btn-primary w-full py-3 uppercase tracking-wider"
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
        <div className="mt-5 text-center text-sm text-content-muted">
          Ainda não tem conta?{' '}
          <Link to={registerPath} className="text-primary font-semibold hover:underline">
            Criar conta
          </Link>
        </div>
      )}
    </>
  )
}
