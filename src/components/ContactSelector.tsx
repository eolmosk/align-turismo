'use client'
import { useState, useEffect, useRef } from 'react'
import { Contact } from '@/types'

interface Props {
  selected: Contact[]
  onChange: (contacts: Contact[]) => void
  placeholder?: string
}

export default function ContactSelector({ selected, onChange, placeholder = 'Buscar o agregar participante...' }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Contact[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Buscar contactos al escribir
  useEffect(() => {
    if (!showDropdown) return
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/contacts?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data: Contact[] = await res.json()
        // Excluir los ya seleccionados
        const selectedIds = new Set(selected.map(c => c.id))
        setResults(data.filter(c => !selectedIds.has(c.id)))
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [query, showDropdown, selected])

  const addContact = (contact: Contact) => {
    onChange([...selected, contact])
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  const removeContact = (id: string) => {
    onChange(selected.filter(c => c.id !== id))
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(false)
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), role: newRole.trim() || null, email: newEmail.trim() || null }),
    })
    if (res.ok) {
      const contact: Contact = await res.json()
      addContact(contact)
    }
    setNewName(''); setNewRole(''); setNewEmail('')
  }

  const roleColor = (role: string | null) => {
    if (!role) return 'bg-warm-100 text-warm-600'
    const r = role.toLowerCase()
    if (r.includes('docente') || r.includes('profesor') || r.includes('maestra')) return 'bg-brand-50 text-brand'
    if (r.includes('padre') || r.includes('madre') || r.includes('tutor') || r.includes('familia')) return 'bg-brand-50 text-green-700'
    if (r.includes('director') || r.includes('coord')) return 'bg-purple-50 text-purple-700'
    return 'bg-warm-100 text-warm-600'
  }

  return (
    <div className="space-y-2">
      {/* Badges de seleccionados */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(c => (
            <span key={c.id}
              className="inline-flex items-center gap-1.5 text-xs bg-brand text-white pl-2.5 pr-1.5 py-1 rounded-full">
              <span className="font-medium">{c.name}</span>
              {c.role && <span className="opacity-60">· {c.role}</span>}
              <button onClick={() => removeContact(c.id)}
                className="hover:opacity-70 transition-opacity ml-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input de búsqueda */}
      <div className="relative" ref={dropdownRef}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDropdown(true); setCreating(false) }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full text-sm"
        />

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-warm-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-56 overflow-y-auto">

            {/* Resultados */}
            {results.map(c => (
              <button key={c.id} onClick={() => { addContact(c); setShowDropdown(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-warm-50 text-left transition-colors border-b border-warm-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-warm-100 flex items-center justify-center flex-shrink-0 text-xs font-medium text-warm-600">
                  {(c.name ?? '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-warm-900 truncate">{c.name}</p>
                  {c.email && <p className="text-xs text-warm-400 truncate">{c.email}</p>}
                </div>
                {c.role && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${roleColor(c.role)}`}>
                    {c.role}
                  </span>
                )}
              </button>
            ))}

            {/* Sin resultados: mensaje */}
            {results.length === 0 && !creating && (
              <div className="px-4 py-2">
                <p className="text-sm text-warm-400">{query ? `Sin resultados para "${query}"` : 'Escribí para buscar'}</p>
              </div>
            )}

            {/* Siempre: opción de crear */}
            {!creating && (
              <button onClick={() => { setCreating(true); setNewName(query) }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-brand hover:bg-brand-50 transition-colors border-t border-warm-100">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {query ? `Crear "${query}" como nuevo contacto` : 'Crear nuevo contacto'}
              </button>
            )}

            {/* Formulario inline de creación */}
            {creating && (
              <div className="p-4 border-t border-warm-100 space-y-2">
                <p className="text-xs font-medium text-warm-500 uppercase tracking-wide mb-2">Nuevo contacto</p>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Nombre completo *" className="w-full text-sm" autoFocus />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={newRole} onChange={e => setNewRole(e.target.value)}
                    placeholder="Rol (ej: Docente)" className="w-full text-sm" />
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    placeholder="Email (opcional)" className="w-full text-sm" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCreate} disabled={!newName.trim()}
                    className="flex-1 bg-brand text-white text-xs py-2 rounded-lg disabled:opacity-40">
                    Crear y agregar
                  </button>
                  <button onClick={() => setCreating(false)}
                    className="px-3 py-2 text-xs text-warm-500 border border-warm-200 rounded-lg hover:bg-warm-50">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
