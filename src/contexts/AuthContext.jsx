import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (error) {
        console.error('Erro ao buscar perfil:', error)
        setProfile(null)
        return null
      }
      setProfile(data)
      return data
    } catch (e) {
      console.error('Erro ao buscar perfil:', e)
      setProfile(null)
      return null
    }
  }

  // 1) Sessão = fonte da verdade.
  // IMPORTANTE: NÃO chamar nenhum método do supabase dentro do callback do
  // onAuthStateChange — a query precisa do token, que disputa o mesmo lock de
  // auth que o callback segura, causando deadlock (trava no refresh). Aqui só
  // atualizamos o estado da sessão; o profile é buscado no effect 2.
  useEffect(() => {
    let active = true

    // Rede de segurança: nunca deixa a tela presa em "Carregando..." indefinidamente.
    const safety = setTimeout(() => { if (active) setLoading(false) }, 8000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!active) return
        setSession(session)
        if (!session) setLoading(false) // sem usuário -> terminou de carregar
      })
      .catch((e) => { console.error('Erro ao iniciar a sessão:', e); if (active) setLoading(false) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setLoading(false)
    })

    return () => {
      active = false
      clearTimeout(safety)
      subscription.unsubscribe()
    }
  }, [])

  // 2) Profile = buscado FORA do lock de auth, reagindo à troca de usuário.
  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) { setProfile(null); return }
    let active = true
    fetchProfile(userId).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session?.user?.id])

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signUp(email, password, metaData = {}) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metaData } })
    return { data, error }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const role = profile?.role || null
  const user = session?.user || null

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
