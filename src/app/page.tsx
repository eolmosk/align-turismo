import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/dashboard')

  const whatsapp = process.env.CONTACT_WHATSAPP ?? ''
  const calendly = process.env.CONTACT_CALENDLY ?? ''

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Neue Montreal', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/align-logo.png" alt="Align" className="h-8" />
          </div>
          <Link
            href="/auth"
            className="text-sm font-medium text-white bg-[#1a1a2e] px-5 py-2.5 rounded-lg hover:bg-[#16213e] transition-colors"
          >
            Ingresar
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-medium text-[#e94560] mb-4 tracking-wide uppercase">
            FrameOps &middot; Soluciones
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1a1a2e] leading-tight tracking-tight mb-6">
            Las reuniones terminan.<br />
            <span className="text-[#e94560]">El seguimiento, no.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Align transforma la gestion de reuniones escolares en seguimiento real con inteligencia artificial.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-[#e94560] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#d63a53] transition-colors shadow-lg shadow-[#e94560]/25"
            >
              Comenzar ahora
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href={calendly}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-medium px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Agendar una demo
            </a>
          </div>
        </div>
      </section>

      {/* ─── PROBLEMA ─── */}
      <section className="py-20 px-6 bg-[#f5f0eb]">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold text-[#e94560] uppercase tracking-widest mb-3">El problema</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-4 tracking-tight">
            En cada escuela se hacen decenas de reuniones por semana
          </h2>
          <p className="text-gray-500 mb-12 max-w-lg">
            Pero sin un sistema, los acuerdos se pierden, los pendientes se olvidan y nadie recuerda quien se comprometio a que.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '📝', title: 'Minutas en papel o Word', desc: 'Archivos sueltos que nadie vuelve a abrir. Sin estructura, sin busqueda, sin continuidad.' },
              { icon: '😵', title: 'Acuerdos que se pierden', desc: '"Quedamos en algo la vez pasada..." pero nadie recuerda exactamente que, ni quien era responsable.' },
              { icon: '⏰', title: 'Horas de trabajo administrativo', desc: 'El equipo directivo pierde tiempo armando actas, enviando recordatorios y verificando cumplimientos.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-[#e8ddd3]">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-[#1a1a2e] mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOLUCION ─── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold text-[#e94560] uppercase tracking-widest mb-3">La solucion</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-12 tracking-tight">
            Todo el seguimiento en un solo lugar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {[
              { icon: '🔗', title: 'Hilos de seguimiento', desc: 'Agrupa reuniones relacionadas en hilos tematicos. Cada hilo tiene su historial, sus pendientes y sus contactos.' },
              { icon: '✅', title: 'Acciones con responsables', desc: 'Cada compromiso tiene un responsable asignado, fecha y estado. Nada se pierde.' },
              { icon: '💬', title: 'Entrada flexible', desc: 'Registra reuniones escribiendo, dictando por voz o subiendo un archivo. La IA hace el resto.' },
              { icon: '📧', title: 'Guias por email', desc: 'Envia automaticamente los pendientes y preguntas a los participantes con un click.' },
              { icon: '🏫', title: 'Multi-escuela', desc: 'Ideal para redes de colegios. Cada escuela tiene su logo, colores y datos aislados.' },
              { icon: '📊', title: 'Estadisticas', desc: 'Datos por tipo de reunion, por mes, por tema. Visibilidad total para el equipo directivo.' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <h4 className="font-bold text-[#1a1a2e] mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section className="py-20 px-6 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold text-[#e94560] uppercase tracking-widest mb-3">Como funciona</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-12 tracking-tight">
            De la reunion al seguimiento en 4 pasos
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {[
              { n: '1', title: 'Registra', desc: 'Escribe, dicta o subi un archivo con las notas.' },
              { n: '2', title: 'La IA analiza', desc: 'Identifica compromisos, genera preguntas y resume.' },
              { n: '3', title: 'Organiza', desc: 'Asigna responsables y agenda la proxima reunion.' },
              { n: '4', title: 'Seguimiento', desc: 'Marca pendientes, envia recordatorios, consulta el historial.' },
            ].map((step, i) => (
              <div key={i}>
                <div className="w-14 h-14 rounded-full bg-[#1a1a2e] text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                  {step.n}
                </div>
                <h4 className="font-bold text-[#1a1a2e] mb-1 text-sm sm:text-base">{step.title}</h4>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── IA ─── */}
      <section className="py-20 px-6 bg-[#1a1a2e] text-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold text-[#ff6b6b] uppercase tracking-widest mb-3">Inteligencia artificial</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
            IA disenada para el contexto educativo
          </h2>
          <p className="text-gray-400 mb-12 max-w-lg">
            No es un chatbot generico. Entiende reuniones escolares y genera seguimiento accionable con sensibilidad institucional.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: '📋', title: 'Resumen automatico', desc: 'Genera un resumen claro de cada reunion, destacando los puntos clave.' },
              { icon: '✅', title: 'Extraccion de compromisos', desc: 'Identifica acuerdos y los convierte en acciones asignables.' },
              { icon: '❓', title: 'Preguntas de seguimiento', desc: 'Sugiere preguntas para la proxima reunion basandose en lo discutido.' },
              { icon: '🏷️', title: 'Clasificacion tematica', desc: 'Categoriza cada reunion: pedagogico, disciplinario, familiar, institucional.' },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h4 className="font-bold mb-1">{item.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TIPOS DE REUNION ─── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold text-[#e94560] uppercase tracking-widest mb-3">Tipos de reunion</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-12 tracking-tight">
            Pensado para cada tipo de encuentro
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { emoji: '👩‍🏫', title: 'Docentes', desc: 'Plenarias, por departamento, por grado. Seguimiento de acuerdos pedagogicos.', bg: 'bg-blue-50 border-blue-200' },
              { emoji: '👨‍👩‍👧', title: 'Padres / Familias', desc: 'Entrevistas individuales o grupales. Registro del dialogo y compromisos mutuos.', bg: 'bg-amber-50 border-amber-200' },
              { emoji: '🤝', title: 'Individuales (1:1)', desc: 'Seguimiento personalizado con docentes o coordinadores. Acompanamiento documentado.', bg: 'bg-green-50 border-green-200' },
              { emoji: '🏛️', title: 'Direccion', desc: 'Equipo directivo, consejo escolar. Decisiones estrategicas con trazabilidad.', bg: 'bg-pink-50 border-pink-200' },
            ].map((item, i) => (
              <div key={i} className={`rounded-2xl p-6 border text-left ${item.bg}`}>
                <div className="text-3xl mb-3">{item.emoji}</div>
                <h4 className="font-bold text-[#1a1a2e] mb-1">{item.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SEGURIDAD ─── */}
      <section className="py-20 px-6 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold text-[#e94560] uppercase tracking-widest mb-3">Confianza</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-12 tracking-tight">
            Seguridad y privacidad desde el diseno
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '🔒', title: 'Login con Google', desc: 'Autenticacion segura con cuentas institucionales. Sin contrasenas adicionales.' },
              { icon: '🏫', title: 'Aislamiento por escuela', desc: 'Cada institucion tiene su espacio privado. Los datos nunca se mezclan.' },
              { icon: '👥', title: 'Roles y permisos', desc: 'Director, coordinador, docente. Cada rol ve solo lo que corresponde.' },
              { icon: '☁️', title: 'Infraestructura cloud', desc: 'Servidores profesionales con backups automaticos y conexiones encriptadas.' },
              { icon: '🤖', title: 'IA responsable', desc: 'IA de ultima generacion. Los datos de tu escuela no se usan para entrenar modelos.' },
              { icon: '📋', title: 'Auditoria completa', desc: 'Registro de toda la actividad. Ideal para supervisiones y acreditaciones.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 text-left">
                <div className="text-xl mb-2">{item.icon}</div>
                <h4 className="font-bold text-[#1a1a2e] text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="py-24 px-6 bg-[#1a1a2e] text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
            Tu escuela merece mejor seguimiento
          </h2>
          <p className="text-gray-400 mb-10 text-lg">
            Agenda una demo personalizada para tu institucion. Sin compromiso.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={calendly}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#e94560] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#d63a53] transition-colors shadow-lg shadow-[#e94560]/25"
            >
              Agendar una demo
            </a>
            <a
              href={`https://wa.me/${whatsapp}`}
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-medium px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              Escribinos por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-6 bg-[#12121f] text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <span>Desarrollado por</span>
          <img src="/align-logo.png" alt="Align" className="h-5 inline-block opacity-50" />
          <span>para</span>
          <span className="font-medium text-gray-400">FrameOps &middot; Soluciones</span>
        </div>
        <p className="text-xs text-gray-600 mt-3">align.frameops.net</p>
      </footer>

    </div>
  )
}
