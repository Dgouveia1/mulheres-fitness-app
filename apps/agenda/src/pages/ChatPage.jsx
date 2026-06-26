import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@emf/shared'
import { getChatContacts, getChatMessages, sendMessage, getRecentMessagesSummary } from '@emf/shared'
import { supabase } from '@emf/shared'
import { ROLE_LABELS, STAFF_ROLES } from '@emf/shared'

export function ChatPage() {
  const { user, profile } = useAuth()
  const [contacts, setContacts] = useState([])
  const [activeContact, setActiveContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all') // all | staff | clients
  const messagesEndRef = useRef()
  const channelRef = useRef(null)
  const activeContactRef = useRef(null)

  // Keep ref in sync so realtime callback always has the latest value
  useEffect(() => { activeContactRef.current = activeContact }, [activeContact])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Load contacts + recent messages summary
  useEffect(() => {
    if (!user?.id) return
    Promise.all([getChatContacts(), getRecentMessagesSummary(user.id)]).then(([cts, msgs]) => {
      const lastMsgMap = {}
      msgs.forEach((m) => {
        const key = m.recipient_id ? [m.sender_id, m.recipient_id].sort().join('_') : 'STAFF_GROUP'
        if (!lastMsgMap[key] || new Date(m.created_at) > new Date(lastMsgMap[key].created_at)) {
          lastMsgMap[key] = m
        }
      })
      const enriched = cts
        .filter((c) => c.id !== user.id)
        .map((c) => {
          const key = [user.id, c.id].sort().join('_')
          return { ...c, lastMsg: lastMsgMap[key] }
        })
      const staffGroup = { id: 'STAFF_GROUP', full_name: 'Grupo da Equipe', role: 'group', lastMsg: lastMsgMap['STAFF_GROUP'] }
      // Sort: group first, then by most recent message
      const sorted = enriched.sort((a, b) => {
        const aTime = a.lastMsg ? new Date(a.lastMsg.created_at).getTime() : 0
        const bTime = b.lastMsg ? new Date(b.lastMsg.created_at).getTime() : 0
        return bTime - aTime
      })
      setContacts([staffGroup, ...sorted])
      setLoadingContacts(false)
    })
  }, [user?.id])

  // Load messages + realtime subscription when active contact changes
  useEffect(() => {
    if (!activeContact || !user?.id) return
    setLoadingMessages(true)
    setSendError(null)

    getChatMessages(user.id, activeContact.id).then((msgs) => {
      setMessages(msgs)
      setLoadingMessages(false)
      setTimeout(scrollToBottom, 100)
    })

    // Cleanup previous subscription
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    const channel = supabase
      .channel(`chat_${user.id}_${activeContact.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new
        const contact = activeContactRef.current
        if (!contact) return

        const isForThisConversation =
          contact.id === 'STAFF_GROUP'
            ? msg.recipient_id === null
            : (msg.sender_id === user.id && msg.recipient_id === contact.id) ||
              (msg.sender_id === contact.id && msg.recipient_id === user.id)

        if (isForThisConversation) {
          // Prevent duplicates (message already added optimistically on send)
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          setTimeout(scrollToBottom, 50)
        }
      })
      .subscribe()

    channelRef.current = channel
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [activeContact?.id, user?.id, scrollToBottom])

  async function handleSend(e) {
    e.preventDefault()
    const content = text.trim()
    if (!content || !activeContact || !user?.id) return

    setSending(true)
    setSendError(null)
    setText('')

    const { data, error } = await sendMessage(user.id, activeContact.id, content, profile?.full_name || 'Usuário')

    if (error) {
      setSendError('Falha ao enviar mensagem. Tente novamente.')
      setText(content) // Restore text so user doesn't lose it
      console.error('sendMessage error:', error)
    } else if (data) {
      // Optimistic add - realtime will deduplicate
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev
        return [...prev, data]
      })
      setTimeout(scrollToBottom, 50)
    }

    setSending(false)
  }

  const filteredContacts = contacts.filter((c) => {
    if (!c.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (tab === 'staff') return c.role === 'group' || STAFF_ROLES.includes(c.role)
    if (tab === 'clients') return c.role === 'user'
    return true
  })

  const roleLabel = (role) => {
    if (role === 'group') return ''
    return ROLE_LABELS[role] || role
  }

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4 min-h-0">
      {/* Contacts sidebar */}
      <div className={`flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden ${activeContact ? 'hidden lg:flex w-80 shrink-0' : 'flex-1 lg:w-80 lg:flex-none lg:shrink-0'}`}>
        <div className="p-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Conversas</h2>
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex gap-1 mt-3 bg-gray-100 rounded-xl p-1">
            {[{ k: 'all', l: 'Todas' }, { k: 'staff', l: 'Equipe' }, { k: 'clients', l: 'Alunas' }].map((t) => (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t.k ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingContacts ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">Nenhum contato encontrado</div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setActiveContact(contact)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${activeContact?.id === contact.id ? 'bg-primary/5' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${contact.id === 'STAFF_GROUP' ? 'bg-purple-100' : 'bg-primary/10'}`}>
                  <span className={`material-icons text-base ${contact.id === 'STAFF_GROUP' ? 'text-purple-600' : 'text-primary'}`}>
                    {contact.id === 'STAFF_GROUP' ? 'groups' : 'person'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${activeContact?.id === contact.id ? 'text-primary' : 'text-gray-800'}`}>
                      {contact.full_name}
                    </p>
                    {contact.role && contact.role !== 'group' && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                        {roleLabel(contact.role)}
                      </span>
                    )}
                  </div>
                  {contact.lastMsg && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{contact.lastMsg.content}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {activeContact ? (
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <button onClick={() => setActiveContact(null)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <span className="material-icons text-gray-500">arrow_back</span>
            </button>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${activeContact.id === 'STAFF_GROUP' ? 'bg-purple-100' : 'bg-primary/10'}`}>
              <span className={`material-icons text-base ${activeContact.id === 'STAFF_GROUP' ? 'text-purple-600' : 'text-primary'}`}>
                {activeContact.id === 'STAFF_GROUP' ? 'groups' : 'person'}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{activeContact.full_name}</p>
              {activeContact.role && activeContact.role !== 'group' && (
                <p className="text-xs text-gray-400">{roleLabel(activeContact.role)}</p>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <span className="material-icons text-5xl text-gray-200">chat_bubble_outline</span>
                <p className="text-sm text-gray-400 mt-2">Nenhuma mensagem ainda.</p>
                <p className="text-xs text-gray-300 mt-1">Envie a primeira mensagem!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isMe ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'} rounded-2xl px-4 py-2.5`}>
                      {!isMe && activeContact.id === 'STAFF_GROUP' && (
                        <p className="text-[10px] font-semibold opacity-70 mb-0.5">{msg.sender_name}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error banner */}
          {sendError && (
            <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <span className="material-icons text-red-500 text-base">error_outline</span>
              <p className="text-xs text-red-600 flex-1">{sendError}</p>
              <button onClick={() => setSendError(null)} className="text-red-400 hover:text-red-600">
                <span className="material-icons text-sm">close</span>
              </button>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-3 px-4 py-3 border-t border-gray-100">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva uma mensagem..."
              className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-dark disabled:opacity-50 active:scale-90 transition-all"
            >
              <span className="material-icons text-base">{sending ? 'hourglass_empty' : 'send'}</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 bg-white rounded-2xl border border-gray-100 items-center justify-center">
          <div className="text-center">
            <span className="material-icons text-5xl text-gray-200">forum</span>
            <p className="text-sm text-gray-400 mt-3">Selecione uma conversa para começar</p>
          </div>
        </div>
      )}
    </div>
  )
}
