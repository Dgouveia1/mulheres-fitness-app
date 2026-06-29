import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@emf/shared'
import { useToast } from '@emf/shared'

function formatCPF(value) {
  return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatPhone(value) {
  return value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2')
}

export function RegisterPage() {
  const { signUp } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', cpf: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'cpf') return setForm((f) => ({ ...f, cpf: formatCPF(value) }))
    if (name === 'phone') return setForm((f) => ({ ...f, phone: formatPhone(value) }))
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signUp(form.email, form.password, {
      full_name: form.full_name,
      cpf: form.cpf,
      phone: form.phone,
      role: 'user',
    })
    setLoading(false)
    if (error) {
      show(error.message || 'Erro ao criar conta.', 'error')
      return
    }
    show('Conta criada! Bem-vinda ao Espaço Mulher!', 'success')
    navigate('/dashboard', { replace: true })
  }

  return (
    <>
      <div className="text-center mb-6 animate-fade-in">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light text-white shadow-pink-sm">
          <span className="material-icons text-2xl" aria-hidden="true">favorite</span>
        </div>
        <h2 className="text-lg font-bold text-content mb-1">Junte-se ao Espaço Mulher</h2>
        <p className="text-xs text-content-subtle">Crie sua conta gratuitamente</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { name: 'full_name', label: 'Nome completo', type: 'text', placeholder: 'Seu nome completo', maxLength: undefined, icon: 'person' },
          { name: 'email', label: 'E-mail', type: 'email', placeholder: 'seu@email.com', maxLength: undefined, icon: 'mail' },
          { name: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00', maxLength: 14, icon: 'badge' },
          { name: 'phone', label: 'Celular', type: 'tel', placeholder: '(11) 99999-9999', maxLength: 15, icon: 'smartphone' },
          { name: 'password', label: 'Senha', type: 'password', placeholder: 'Crie uma senha segura', maxLength: undefined, icon: 'lock' },
        ].map((field) => (
          <div key={field.name} className="animate-slide-up">
            <label htmlFor={`register-${field.name}`} className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">{field.label}</label>
            <div className="relative">
              <span className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-content-subtle" aria-hidden="true">{field.icon}</span>
              <input
                id={`register-${field.name}`}
                type={field.type}
                name={field.name}
                value={form[field.name]}
                onChange={handleChange}
                required
                placeholder={field.placeholder}
                maxLength={field.maxLength}
                className="emf-input pl-10"
              />
            </div>
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="emf-btn-primary w-full py-3 uppercase tracking-wider"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Criando conta...
            </>
          ) : 'Criar Conta e Começar'}
        </button>
      </form>
      <div className="mt-5 text-center text-sm text-content-muted">
        Já tem cadastro?{' '}
        <Link to="/login" className="text-primary font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded">
          Entrar
        </Link>
      </div>
    </>
  )
}
