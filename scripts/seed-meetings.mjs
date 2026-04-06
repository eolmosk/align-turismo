import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Leer .env.local manualmente
const env = readFileSync('.env.local', 'utf-8')
const get = (key) => env.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim()

const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))

// ── Obtener school y user ────────────────────────────────────────────────────
const { data: schools } = await supabase.from('schools').select('id, name').limit(1)
const school = schools?.[0]
if (!school) { console.error('No hay escuelas en la DB'); process.exit(1) }

const { data: users } = await supabase.from('users').select('id').eq('school_id', school.id).limit(1)
const user = users?.[0]
if (!user) { console.error('No hay usuarios en la DB'); process.exit(1) }

console.log(`Escuela: ${school.name} (${school.id})`)

// ── Contactos ────────────────────────────────────────────────────────────────
const contacts = [
  { name: 'Prof. Andrea Méndez',  role: 'Docente', email: 'amendez@escuela.edu.ar' },
  { name: 'Prof. Carlos Reyes',   role: 'Docente', email: 'creyes@escuela.edu.ar' },
  { name: 'Lic. Sofía Blanco',    role: 'Coordinadora', email: 'sblanco@escuela.edu.ar' },
  { name: 'Prof. Marcelo Torres', role: 'Docente Tecnología', email: 'mtorres@escuela.edu.ar' },
  { name: 'Sra. Laura Rodríguez', role: 'Madre', email: 'lrodriguez@gmail.com' },
  { name: 'Sr. Pablo Rodríguez',  role: 'Padre', email: 'prodriguez@gmail.com' },
]

const { data: savedContacts } = await supabase
  .from('contacts')
  .upsert(contacts.map(c => ({ ...c, school_id: school.id, source: 'manual' })), { onConflict: 'school_id,email' })
  .select()

const byName = Object.fromEntries(savedContacts.map(c => [c.name, c]))
console.log(`Contactos creados: ${savedContacts.length}`)

// ── Hilo 1: Equipo de Matemáticas — 3 reuniones mismos participantes ─────────
const { data: hilo1 } = await supabase.from('threads').insert({
  school_id: school.id, user_id: user.id,
  name: 'Equipo docente · Matemáticas 2do ciclo',
  type: 'docentes', course: '4to-6to', subject: 'Matemáticas',
  academic_year: 2026, topic: 'pedagógico',
  description: 'Seguimiento de planificación y avance del área',
}).select().single()

await supabase.from('thread_contacts').insert([
  { thread_id: hilo1.id, contact_id: byName['Prof. Andrea Méndez'].id },
  { thread_id: hilo1.id, contact_id: byName['Prof. Carlos Reyes'].id },
  { thread_id: hilo1.id, contact_id: byName['Lic. Sofía Blanco'].id },
])

const reuniones1 = [
  {
    title: 'Planificación del 1er trimestre',
    meeting_date: '2026-02-14',
    notes: `Revisamos la planificación anual del área de matemáticas para el segundo ciclo.
Andrea presentó la secuencia de contenidos para 4to y 5to. Carlos propuso incorporar resolución de problemas contextualizados en 6to.
Sofía pidió revisar la articulación con el 1er ciclo antes de cerrar la planificación.
Se acordó hacer un diagnóstico en la primera semana de clases para ajustar el punto de partida.
Queda pendiente definir los criterios de evaluación comunes para el área.`,
    ai_summary: 'Se acordó planificación preliminar del área con énfasis en resolución de problemas. Pendiente: criterios de evaluación comunes y diagnóstico inicial.',
    ai_questions: ['¿Se completó el diagnóstico inicial en todas las secciones?', '¿Se acordaron los criterios de evaluación comunes?', '¿Cómo resultó la articulación con el primer ciclo?'],
    ai_commitments: ['Andrea: compartir secuencia de 4to y 5to antes del 20/02', 'Carlos: diseñar actividad diagnóstico para 6to', 'Sofía: convocar reunión con docentes de 1er ciclo'],
  },
  {
    title: 'Seguimiento de avance — mitad de trimestre',
    meeting_date: '2026-03-10',
    notes: `Se revisó el avance de la planificación en las distintas secciones.
Andrea reportó que 4to va bien pero 5to tiene dificultades con fracciones. Se decidió agregar una semana de repaso.
Carlos compartió los resultados del diagnóstico: el nivel general de 6to está por debajo de lo esperado en operaciones con decimales.
Sofía sugirió armar materiales de refuerzo compartidos para el área.
Se habló sobre la necesidad de comunicar a las familias los ajustes en el ritmo de avance.`,
    ai_summary: 'Avance dispar entre secciones. Se detectaron dificultades en fracciones (5to) y decimales (6to). Se acordó elaborar materiales de refuerzo comunes.',
    ai_questions: ['¿Mejoraron los resultados en fracciones de 5to tras el repaso?', '¿Se elaboraron los materiales de refuerzo del área?', '¿Se comunicó a las familias el ajuste en el ritmo?'],
    ai_commitments: ['Andrea: semana de repaso en fracciones para 5to', 'Carlos: informe de diagnóstico para Sofía', 'Sofía: armar banco de actividades de refuerzo'],
  },
  {
    title: 'Cierre de trimestre y ajuste de planificación',
    meeting_date: '2026-04-01',
    notes: `Cerramos el análisis del primer trimestre. Los resultados de evaluación mostraron mejora en 5to respecto a fracciones.
6to sigue con dificultades en decimales pero se mejoró con los materiales de refuerzo.
Se acordó mantener la estructura de reuniones quincenales para el 2do trimestre.
Carlos propuso incorporar autoevaluación de los alumnos como herramienta del área.
Se definieron los temas prioritarios para el 2do trimestre: estadística y proporcionalidad.`,
    ai_summary: 'Cierre de trimestre positivo. Mejora general en los grupos. Se planifica 2do trimestre con foco en estadística y proporcionalidad.',
    ai_questions: ['¿Se implementó la autoevaluación en alguna sección?', '¿Cómo se distribuirán los contenidos de estadística entre los grados?'],
    ai_commitments: ['Carlos: diseñar protocolo de autoevaluación para presentar al equipo', 'Sofía: validar planificación del 2do trimestre con dirección'],
  },
]

for (const r of reuniones1) {
  const { data: m } = await supabase.from('meetings').insert({
    school_id: school.id, user_id: user.id, thread_id: hilo1.id,
    type: 'docentes', ...r
  }).select().single()
  await supabase.from('meeting_contacts').insert([
    { meeting_id: m.id, contact_id: byName['Prof. Andrea Méndez'].id },
    { meeting_id: m.id, contact_id: byName['Prof. Carlos Reyes'].id },
    { meeting_id: m.id, contact_id: byName['Lic. Sofía Blanco'].id },
  ])
  // Acciones
  const actions = [
    { text: r.ai_commitments[0], done: r === reuniones1[0] ? false : true },
    { text: r.ai_commitments[1], done: false },
  ]
  await supabase.from('meeting_actions').insert(actions.map(a => ({ meeting_id: m.id, ...a })))
}

await supabase.from('threads').update({ last_meeting_at: '2026-04-01' }).eq('id', hilo1.id)
console.log('Hilo 1 creado: Equipo Matemáticas')

// ── Hilo 2: Proyecto STEM — 2 reuniones con participantes que se suman ────────
const { data: hilo2 } = await supabase.from('threads').insert({
  school_id: school.id, user_id: user.id,
  name: 'Proyecto STEM · Integración interdisciplinaria',
  type: 'docentes', topic: 'curricular',
  academic_year: 2026,
  description: 'Articulación entre matemáticas, ciencias y tecnología para proyecto de aula integrado',
}).select().single()

await supabase.from('thread_contacts').insert([
  { thread_id: hilo2.id, contact_id: byName['Prof. Andrea Méndez'].id },
  { thread_id: hilo2.id, contact_id: byName['Prof. Carlos Reyes'].id },
  { thread_id: hilo2.id, contact_id: byName['Prof. Marcelo Torres'].id },
  { thread_id: hilo2.id, contact_id: byName['Lic. Sofía Blanco'].id },
])

const reuniones2 = [
  {
    title: 'Reunión inicial — definición del proyecto',
    meeting_date: '2026-03-03',
    contactIds: ['Prof. Andrea Méndez', 'Prof. Carlos Reyes', 'Lic. Sofía Blanco'],
    notes: `Primera reunión para diseñar el proyecto STEM interdisciplinario.
Participaron Andrea (matemáticas) y Carlos (ciencias naturales) junto con Sofía como coordinadora.
Se acordó trabajar con 5to grado como grupo piloto. El eje temático será "medición y proporciones en la naturaleza".
Matemáticas aportará proporcionalidad y estadística. Ciencias aportará biodiversidad y escalas en ecosistemas.
Se habló de la necesidad de sumar al docente de tecnología para la parte de presentación digital del proyecto.
Quedó pendiente definir el cronograma detallado y los criterios de evaluación integrados.`,
    ai_summary: 'Se definió eje temático y materias participantes. Pendiente incorporar tecnología y cerrar cronograma y criterios de evaluación.',
    ai_questions: ['¿Se sumó el docente de tecnología al proyecto?', '¿Se definió el cronograma detallado?', '¿Se comunicó a los alumnos de 5to el proyecto?'],
    ai_commitments: ['Sofía: convocar al docente de tecnología para la próxima reunión', 'Andrea y Carlos: borrador de cronograma integrado'],
  },
  {
    title: 'Incorporación de Tecnología — planificación integrada',
    meeting_date: '2026-03-24',
    contactIds: ['Prof. Andrea Méndez', 'Prof. Carlos Reyes', 'Prof. Marcelo Torres', 'Lic. Sofía Blanco'],
    notes: `Se sumó Marcelo Torres (tecnología) al equipo. Presentó herramientas digitales para que los alumnos documenten y presenten el proyecto: Canva para infografías y hojas de cálculo para análisis de datos.
El equipo cerró el cronograma: 6 semanas de trabajo, con una exposición final en la semana del 12 de mayo.
Se acordó que cada área tendrá 2 clases por semana destinadas al proyecto.
Surgió la necesidad de comunicar a las familias el proyecto y su impacto en las calificaciones del trimestre.
Se definió que la evaluación tendrá 3 componentes: proceso (40%), producto final (40%) y autoevaluación (20%).`,
    ai_summary: 'Equipo completo. Cronograma cerrado con exposición el 12/05. Criterios de evaluación integrados definidos. Pendiente comunicación a familias.',
    ai_questions: ['¿Se comunicó a las familias el proyecto y los criterios de evaluación?', '¿Cómo va el avance de los alumnos en las primeras semanas?', '¿Se necesitan ajustes en el cronograma?'],
    ai_commitments: ['Sofía: nota informativa a familias de 5to', 'Marcelo: tutorial de Canva para los alumnos', 'Equipo: primera revisión de avance el 07/04'],
  },
]

for (const r of reuniones2) {
  const { data: m } = await supabase.from('meetings').insert({
    school_id: school.id, user_id: user.id, thread_id: hilo2.id,
    type: 'docentes',
    title: r.title, meeting_date: r.meeting_date,
    notes: r.notes, ai_summary: r.ai_summary,
    ai_questions: r.ai_questions, ai_commitments: r.ai_commitments,
    topic: 'curricular',
  }).select().single()
  await supabase.from('meeting_contacts').insert(
    r.contactIds.map(name => ({ meeting_id: m.id, contact_id: byName[name].id }))
  )
  await supabase.from('meeting_actions').insert([
    { meeting_id: m.id, text: r.ai_commitments[0], done: false },
    { meeting_id: m.id, text: r.ai_commitments[1], done: false },
  ])
}

await supabase.from('threads').update({ last_meeting_at: '2026-03-24' }).eq('id', hilo2.id)
console.log('Hilo 2 creado: Proyecto STEM')

// ── Hilo 3: Familia Rodríguez ────────────────────────────────────────────────
const { data: hilo3 } = await supabase.from('threads').insert({
  school_id: school.id, user_id: user.id,
  name: 'Familia Rodríguez · Tomás 5to A',
  type: 'padres', topic: 'familiar',
  academic_year: 2026, course: '5to A',
  description: 'Seguimiento del rendimiento y situación familiar de Tomás Rodríguez',
}).select().single()

await supabase.from('thread_contacts').insert([
  { thread_id: hilo3.id, contact_id: byName['Sra. Laura Rodríguez'].id },
  { thread_id: hilo3.id, contact_id: byName['Sr. Pablo Rodríguez'].id },
])

const { data: m3 } = await supabase.from('meetings').insert({
  school_id: school.id, user_id: user.id, thread_id: hilo3.id,
  type: 'padres', topic: 'familiar',
  title: 'Entrevista con la familia — situación de Tomás',
  meeting_date: '2026-03-18',
  notes: `Reunión con Laura y Pablo Rodríguez, padres de Tomás (5to A).
Los padres manifestaron preocupación por la baja en el rendimiento de Tomás en los últimos meses.
Comentaron que hubo cambios en el entorno familiar: mudanza en enero y cambio de grupo de amigos.
Tomás muestra desmotivación en matemáticas y ciencias. En lengua y plástica se mantiene bien.
Se conversó sobre la importancia del acompañamiento desde casa: rutina de estudio, reducción del tiempo de pantallas.
Los padres se comprometieron a establecer un horario fijo de tarea.
La escuela se compromete a hacer seguimiento cercano con los docentes del área y a comunicar avances quincenalmente.
Se acordó una nueva reunión en 30 días para evaluar evolución.`,
  ai_summary: 'Entrevista por bajo rendimiento de Tomás. Contexto de cambios familiares. Padres comprometidos con rutina de estudio. Seguimiento en 30 días.',
  ai_questions: ['¿Mejoró la situación de Tomás en matemáticas y ciencias?', '¿Se estableció la rutina de estudio en casa?', '¿Cómo es la integración de Tomás con su nuevo grupo?', '¿Los docentes del área reportan cambios en la actitud de Tomás?'],
  ai_commitments: ['Escuela: contacto quincenal con la familia sobre avances', 'Padres: rutina fija de tarea y reducción de pantallas', 'Coordinación: alertar a docentes de matemáticas y ciencias'],
}).select().single()

await supabase.from('meeting_contacts').insert([
  { meeting_id: m3.id, contact_id: byName['Sra. Laura Rodríguez'].id },
  { meeting_id: m3.id, contact_id: byName['Sr. Pablo Rodríguez'].id },
])
await supabase.from('meeting_actions').insert([
  { meeting_id: m3.id, text: 'Contactar a la familia en 2 semanas para chequeo de avance', done: false, assigned_to: 'Coordinación' },
  { meeting_id: m3.id, text: 'Alertar a docentes de matemáticas y ciencias sobre la situación de Tomás', done: true, assigned_to: 'Coordinación' },
  { meeting_id: m3.id, text: 'Establecer rutina fija de tarea y reducir pantallas', done: false, assigned_to: 'Familia Rodríguez' },
])

await supabase.from('threads').update({ last_meeting_at: '2026-03-18' }).eq('id', hilo3.id)
console.log('Hilo 3 creado: Familia Rodríguez')

console.log('\n✓ Seed completo. 6 reuniones creadas en 3 hilos.')
