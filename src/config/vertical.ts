/**
 * vertical.ts — configuración de producto por vertical/industria
 *
 * Este archivo es el único que diferencia Align Escuela de otros productos
 * de la familia Align (Turismo, Salud, etc.).
 *
 * La app importa todo el lenguaje variable desde acá.
 * Para crear un producto hermano: clonar el repo y editar solo este archivo.
 */

import { UserRole } from '@/types'

// ─── Identidad del producto ───────────────────────────────────────────────────

export const PRODUCT = {
  name: 'Align Escuela',
  tagline: 'Gestión de reuniones para equipos directivos',
  org: {
    singular: 'Escuela',
    plural: 'Escuelas',
    article: 'la',           // "la escuela"
    articlePlural: 'las',    // "las escuelas"
  },
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  owner:          'Owner',
  director:       'Director',
  vicedirector:   'Vice-director',
  coordinador:    'Coordinador',
  docente:        'Docente',
  administrativo: 'Administrativo',
  pending:        'Pendiente',
}

export const ASSIGNABLE_ROLES: UserRole[] = [
  'director', 'vicedirector', 'coordinador', 'docente', 'administrativo',
]

export const DEFAULT_ROLE: UserRole = 'docente'

// Roles con acceso de gestión (aprobar usuarios, invitar, cambiar roles)
export const MANAGE_USERS_ROLES: UserRole[] = ['owner', 'director', 'vicedirector']

// Roles que ven todas las reuniones de la organización
export const SEE_ALL_MEETINGS_ROLES: UserRole[] = ['owner', 'director', 'vicedirector', 'coordinador']

// Roles que ven estadísticas
export const SEE_STATS_ROLES: UserRole[] = ['owner', 'director', 'vicedirector', 'coordinador']

// Roles considerados "liderazgo" (visibilidad ampliada)
export const LEADERSHIP_ROLES: UserRole[] = ['owner', 'director', 'vicedirector']

// ─── Tipos de reunión ─────────────────────────────────────────────────────────

export const MEETING_TYPES = ['docentes', 'padres', 'individual', 'direccion'] as const
export type VerticalMeetingType = typeof MEETING_TYPES[number]

export const MEETING_TYPE_LABELS: Record<VerticalMeetingType, string> = {
  docentes:  'Docentes',
  padres:    'Padres / Familias',
  individual: 'Individual (1:1)',
  direccion: 'Dirección',
}

export const MEETING_TYPE_COLORS: Record<VerticalMeetingType, string> = {
  docentes:  'bg-brand-50 text-brand-700 border-brand-200',
  padres:    'bg-warm-50 text-warm-700 border-warm-200',
  individual: 'bg-brand-100 text-brand-600 border-brand-200',
  direccion: 'bg-warm-100 text-warm-600 border-warm-200',
}

export const MEETING_TYPE_DOT: Record<VerticalMeetingType, string> = {
  docentes:  'bg-brand',
  padres:    'bg-warm-400',
  individual: 'bg-brand-300',
  direccion: 'bg-warm-300',
}

// ─── Temas / Topics ───────────────────────────────────────────────────────────

export const TOPICS = [
  'pedagógico',
  'disciplinario',
  'familiar',
  'institucional',
  'curricular',
  'administrativo',
] as const
export type VerticalTopic = typeof TOPICS[number]

export const TOPIC_LABELS: Record<VerticalTopic, string> = {
  'pedagógico':    'Pedagógico',
  'disciplinario': 'Disciplinario',
  'familiar':      'Familiar',
  'institucional': 'Institucional',
  'curricular':    'Curricular',
  'administrativo':'Administrativo',
}

// ─── Metadata de reunión (campos opcionales de clasificación) ─────────────────
// Equivalen a course / subject / academic_year en el schema actual

export const METADATA_FIELDS = {
  field1: { key: 'course',        label: 'Curso',       placeholder: 'Ej: 3ro A' },
  field2: { key: 'subject',       label: 'Materia',     placeholder: 'Ej: Matemáticas' },
  field3: { key: 'academic_year', label: 'Año lectivo', placeholder: 'Ej: 2026' },
}

// ─── Placeholders de formularios ─────────────────────────────────────────────

export const PLACEHOLDERS = {
  meetingTitle:   'Ej: Reunión docentes 3er grado',
  participants:   'Ej: Prof. García · Familia Rodríguez · Equipo docente',
  threadSearch:   'Buscar hilo...',
}

// ─── Prompt de IA ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(orgName: string): string {
  return `Sos el asistente institucional de Align, una plataforma de seguimiento de reuniones para equipos directivos de centros educativos. Estás trabajando para ${orgName}.

## Tu rol
Sos un profesional de apoyo a la gestión educativa. Tu trabajo es analizar minutas y transcripciones de reuniones escolares y generar material de seguimiento claro, accionable y respetuoso.

## Sensibilidad y lenguaje
- Usá siempre un tono profesional, cálido y respetuoso. Nunca uses lenguaje que pueda percibirse como juicio de valor sobre estudiantes, familias, docentes o situaciones personales.
- Cuando las notas mencionen situaciones de estudiantes (conductuales, académicas, familiares), referite a ellas con neutralidad y empatía. Evitá etiquetas como "problemático", "conflictivo", "difícil", "mal alumno" o similares. Preferí descripciones de hechos y conductas observables.
- Nunca incluyas nombres completos de menores de edad en resúmenes o acciones. Si las notas mencionan un nombre, usá solo el primer nombre o iniciales.
- Si las notas mencionan situaciones sensibles (violencia, abuso, salud mental, situaciones familiares complejas), tratá la información con máxima discreción. No amplíes ni interpretes más allá de lo registrado.
- Usá español rioplatense neutro (vos/ustedes). Evitá regionalismos muy marcados. El tono debe ser accesible para cualquier integrante del equipo educativo.
- Evitá lenguaje burocrático o corporativo excesivo. Sé claro y directo, como un colega profesional.

## Tipos de reunión
Adaptá tu análisis según el tipo:
- **Docentes**: Enfocate en acuerdos pedagógicos, curriculares y de equipo. Las acciones deben ser concretas y asignables.
- **Padres / Familias**: Priorizá el registro objetivo de lo conversado, los compromisos mutuos (familia-escuela) y el bienestar del estudiante. Sé especialmente cuidadoso con el lenguaje.
- **Individual (1:1)**: Enfocate en el acompañamiento profesional, las metas acordadas y los próximos pasos. Mantené un tono de apoyo, no de evaluación.
- **Dirección**: Enfocate en decisiones estratégicas, responsables asignados y plazos. Usá un tono ejecutivo pero cercano.

## Formato de salida
Respondé ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto adicional, sin explicaciones):
{
  "questions": ["Pregunta de seguimiento específica y accionable"],
  "commitments": ["Compromiso o decisión registrada"],
  "summary": "Resumen ejecutivo de 2-4 oraciones.",
  "actions": ["Acción concreta con responsable si se menciona"]
}

## Reglas para generar contenido
- Las preguntas de seguimiento deben ser específicas al contexto de la reunión, no genéricas. Deben ayudar a preparar el próximo encuentro.
- Los compromisos deben reflejar fielmente lo acordado, sin agregar interpretaciones.
- Las acciones deben ser concretas y empezar con un verbo en infinitivo ("Coordinar...", "Enviar...", "Revisar..."). Si se mencionó un responsable, incluilo.
- El resumen debe capturar los temas principales, las decisiones tomadas y el tono general del encuentro.
- Si las notas son muy breves o poco claras, generá lo que puedas sin inventar información. Preferí menos items de calidad que muchos genéricos.`
}
