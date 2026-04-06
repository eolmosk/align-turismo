'use client'
import { useEffect, useState, useRef } from 'react'

interface SchoolOption {
  id: string
  name: string
  role: string
  active: boolean
  logo_url: string | null
  color_primary: string | null
}

export default function SchoolSwitcher({
  currentSchoolName,
  onSwitch,
}: {
  currentSchoolName: string
  onSwitch: () => void
}) {
  const [schools, setSchools] = useState<SchoolOption[]>([])
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/schools')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSchools(data) })
  }, [])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSwitch = async (schoolId: string) => {
    setSwitching(true)
    setOpen(false)
    await fetch('/api/schools/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_id: schoolId }),
    })
    onSwitch()
  }

  // Si tiene 1 o 0 escuelas, mostrar texto estático
  if (schools.length <= 1) {
    return (
      <h1 className="text-base font-medium text-warm-900 truncate">
        {currentSchoolName}
      </h1>
    )
  }

  const activeSchool = schools.find(s => s.active)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-1.5 text-base font-medium text-warm-900 hover:text-brand transition-colors disabled:opacity-50"
      >
        <span className="truncate max-w-[200px] sm:max-w-[300px]">
          {switching ? 'Cambiando...' : (activeSchool?.name ?? currentSchoolName)}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-72 bg-white border border-warm-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-warm-100">
            <p className="text-[10px] font-semibold text-warm-400 uppercase tracking-wider">Cambiar escuela</p>
          </div>
          {schools.map(s => (
            <button
              key={s.id}
              onClick={() => !s.active && handleSwitch(s.id)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors ${
                s.active
                  ? 'bg-brand-50 text-brand-700'
                  : 'hover:bg-warm-50 text-warm-700'
              }`}
            >
              <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: s.color_primary || '#CD4700' }}>
                {s.logo_url
                  ? <img src={s.logo_url} alt="" className="w-full h-full object-contain" />
                  : <span className="text-white text-[10px] font-bold">{s.name.charAt(0)}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-[11px] text-warm-400 capitalize">{s.role}</p>
              </div>
              {s.active && (
                <svg className="w-4 h-4 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
