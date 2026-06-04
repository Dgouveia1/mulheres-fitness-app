import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'

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
      <h2 className="text-lg font-bold text-gray-800 mb-1 text-center">Junte-se ao Espaço Mulher</h2>
      <p className="text-xs text-gray-400 text-center mb-5">Crie sua conta gratuitamente</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { name: 'full_name', label: 'Nome completo', type: 'text', placeholder: 'Seu nome completo', maxLength: undefined },
          { name: 'email', label: 'E-mail', type: 'email', placeholder: 'seu@email.com', maxLength: undefined },
          { name: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00', maxLength: 14 },
          { name: 'phone', label: 'Celular', type: 'tel', placeholder: '(11) 99999-9999', maxLength: 15 },
          { name: 'password', label: 'Senha', type: 'password', placeholder: 'Crie uma senha segura', maxLength: undefined },
        ].map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{field.label}</label>
            <input
              type={field.type}
              name={field.name}
              value={form[field.name]}
              onChange={handleChange}
              required
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm uppercase tracking-wider hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Criando conta...
            </>
          ) : 'Criar Conta e Começar'}
        </button>
      </form>
      <div className="mt-4 text-center text-sm text-gray-500">
        Já tem cadastro?{' '}
        <Link to="/login" className="text-primary font-semibold hover:underline">
          Entrar
        </Link>
      </div>
    </>
  )
}
