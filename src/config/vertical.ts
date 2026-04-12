/**
 * vertical.ts — configuración de producto: Align Turismo
 *
 * Este archivo es el único que diferencia Align Turismo de otros productos
 * de la familia Align (Escuela, Salud, etc.).
 *
 * Sectores soportados: 'hotel' | 'agencia' | 'operadora'
 * El sector se define por organización en la DB (organizations.sector).
 */

import { UserRole } from '@/types'

// ─── Sectores disponibles ─────────────────────────────────────────────────────

export type Sector = 'hotel' | 'agencia' | 'operadora'

export const SECTOR_LABELS: Record<Sector, string> = {
  hotel:     'Hotel',
  agencia:   'Agencia de viajes',
  operadora: 'Operadora turística',
}

export const SECTORS: Sector[] = ['hotel', 'agencia', 'operadora']

// ─── Identidad del producto ───────────────────────────────────────────────────

export const PRODUCT = {
  name: 'Align Turismo',
  tagline: 'Gestión de reuniones para equipos de turismo',
  org: {
    singular: 'Organización',
    plural: 'Organizaciones',
    article: 'la',
    articlePlural: 'las',
  },
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  owner:          'Owner',
  director:       'Gerente General',
  vicedirector:   'Subgerente',
  coordinador:    'Supervisor',
  docente:        'Staff',
  administrativo: 'Administrativo',
  pending:        'Pendiente',
}

export const ASSIGNABLE_ROLES: UserRole[] = [
  'director', 'vicedirector', 'coordinador', 'docente', 'administrativo',
]

export const DEFAULT_ROLE: UserRole = 'docente'

// Roles con acceso de gestión
export const MANAGE_USERS_ROLES: UserRole[] = ['owner', 'director', 'vicedirector']

// Roles que ven todas las reuniones de la organización
export const SEE_ALL_MEETINGS_ROLES: UserRole[] = ['owner', 'director', 'vicedirector', 'coordinador']

// Roles que ven estadísticas
export const SEE_STATS_ROLES: UserRole[] = ['owner', 'director', 'vicedirector', 'coordinador']

// Roles considerados "liderazgo"
export const LEADERSHIP_ROLES: UserRole[] = ['owner', 'director', 'vicedirector']

// ─── Tipos de reunión ─────────────────────────────────────────────────────────

export const MEETING_TYPES = ['equipo', 'proveedor', 'cliente', 'gerencia'] as const
export type VerticalMeetingType = typeof MEETING_TYPES[number]

export const MEETING_TYPE_LABELS: Record<VerticalMeetingType, string> = {
  equipo:    'Equipo / Turno',
  proveedor: 'Proveedor',
  cliente:   'Cliente',
  gerencia:  'Gerencia',
}

export const MEETING_TYPE_COLORS: Record<VerticalMeetingType, string> = {
  equipo:    'bg-brand-50 text-brand-700 border-brand-200',
  proveedor: 'bg-warm-50 text-warm-700 border-warm-200',
  cliente:   'bg-brand-100 text-brand-600 border-brand-200',
  gerencia:  'bg-warm-100 text-warm-600 border-warm-200',
}

export const MEETING_TYPE_DOT: Record<VerticalMeetingType, string> = {
  equipo:    'bg-brand',
  proveedor: 'bg-warm-400',
  cliente:   'bg-brand-300',
  gerencia:  'bg-warm-300',
}

// Labels por sector (override sobre los defaults)
export const MEETING_TYPE_LABELS_BY_SECTOR: Partial<Record<Sector, Partial<Record<VerticalMeetingType, string>>>> = {
  hotel: {
    equipo:    'Briefing de turno',
    cliente:   'Huésped / Grupo',
  },
  agencia: {
    proveedor: 'Proveedor / Mayorista',
  },
  operadora: {
    equipo:    'Coordinación de tour',
    proveedor: 'Proveedor / Guía',
    cliente:   'Grupo / Cliente',
  },
}

export function getMeetingTypeLabel(type: VerticalMeetingType, sector?: Sector): string {
  if (sector) return MEETING_TYPE_LABELS_BY_SECTOR[sector]?.[type] ?? MEETING_TYPE_LABELS[type]
  return MEETING_TYPE_LABELS[type]
}

// ─── Temas / Topics ───────────────────────────────────────────────────────────

export const TOPICS = [
  'operativo',
  'comercial',
  'calidad',
  'RRHH',
  'logística',
  'seguridad',
] as const
export type VerticalTopic = typeof TOPICS[number]

export const TOPIC_LABELS: Record<VerticalTopic, string> = {
  'operativo': 'Operativo',
  'comercial': 'Comercial',
  'calidad':   'Calidad / Experiencia',
  'RRHH':      'RRHH',
  'logística': 'Logística',
  'seguridad': 'Seguridad',
}

// ─── Metadata de reunión ──────────────────────────────────────────────────────
// Reutiliza las columnas course / subject / academic_year de la DB
// con labels adaptados al turismo

export const METADATA_FIELDS = {
  field1: { key: 'course',        label: 'Área',      placeholder: 'Ej: Housekeeping, Recepción' },
  field2: { key: 'subject',       label: 'Categoría', placeholder: 'Ej: Temporada alta, Grupo VIP' },
  field3: { key: 'academic_year', label: 'Temporada', placeholder: 'Ej: 2026' },
}

export const METADATA_FIELDS_BY_SECTOR: Partial<Record<Sector, typeof METADATA_FIELDS>> = {
  hotel: {
    field1: { key: 'course',        label: 'Departamento',   placeholder: 'Ej: Housekeeping, F&B, Recepción' },
    field2: { key: 'subject',       label: 'Turno / Evento', placeholder: 'Ej: Turno mañana, Evento corporativo' },
    field3: { key: 'academic_year', label: 'Temporada',      placeholder: 'Ej: Temporada alta 2026' },
  },
  agencia: {
    field1: { key: 'course',        label: 'Línea de producto', placeholder: 'Ej: Cruceros, Paquetes nacionales' },
    field2: { key: 'subject',       label: 'Destino / Tour',    placeholder: 'Ej: Caribe, Patagonia' },
    field3: { key: 'academic_year', label: 'Temporada',         placeholder: 'Ej: 2026' },
  },
  operadora: {
    field1: { key: 'course',        label: 'Tipo de tour',   placeholder: 'Ej: Aventura, Cultural, Transfer' },
    field2: { key: 'subject',       label: 'Destino / Ruta', placeholder: 'Ej: Ruta 40, Torres del Paine' },
    field3: { key: 'academic_year', label: 'Temporada',      placeholder: 'Ej: 2026' },
  },
}

export function getMetadataFields(sector?: Sector) {
  if (sector) return METADATA_FIELDS_BY_SECTOR[sector] ?? METADATA_FIELDS
  return METADATA_FIELDS
}

// ─── Placeholders de formularios ─────────────────────────────────────────────

export const PLACEHOLDERS = {
  meetingTitle: 'Ej: Briefing de temporada alta',
  participants: 'Ej: Gerente Ops · Jefa de Recepción · Supervisor Housekeeping',
  threadSearch: 'Buscar cliente, proveedor o grupo...',
}

// ─── Prompt de IA ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(orgName: string, sector?: Sector): string {
  const sectorLabel = sector ? SECTOR_LABELS[sector] : 'empresa de turismo'

  const meetingTypeInstructions: Record<VerticalMeetingType, string> = {
    equipo:    'Enfocate en acuerdos operativos, distribución de tareas y resolución de problemas del turno o temporada. Las acciones deben ser concretas, con responsable y plazo si se mencionan.',
    proveedor: 'Priorizá los compromisos comerciales, condiciones acordadas, plazos de entrega y próximos pasos. Sé preciso con cifras y fechas si aparecen en las notas.',
    cliente:   'Registrá objetivamente los requerimientos del cliente, las soluciones ofrecidas y los compromisos asumidos. Sé especialmente cuidadoso con expectativas y promesas realizadas.',
    gerencia:  'Enfocate en decisiones estratégicas, KPIs, responsables asignados y plazos. Usá un tono ejecutivo y directo.',
  }

  const instructionsList = (Object.keys(meetingTypeInstructions) as VerticalMeetingType[])
    .map(tipo => `- **${getMeetingTypeLabel(tipo, sector)}**: ${meetingTypeInstructions[tipo]}`)
    .join('\n')

  return `Sos el asistente operativo de Align Turismo, una plataforma de seguimiento de reuniones para equipos de turismo y hospitalidad. Estás trabajando para ${orgName}, una ${sectorLabel}.

## Tu rol
Sos un profesional de apoyo a la gestión operativa y comercial en la industria del turismo. Tu trabajo es analizar minutas y transcripciones de reuniones y generar material de seguimiento claro, accionable y profesional.

## Sensibilidad y lenguaje
- Usá siempre un tono profesional, directo y orientado a la acción. El turismo es una industria de servicio — el lenguaje debe reflejar agilidad y orientación al cliente.
- Cuando las notas mencionen situaciones con huéspedes, clientes o grupos, tratá la información con discreción. No incluyas datos personales de clientes en resúmenes.
- Si las notas mencionan conflictos, quejas o incidentes, describí los hechos con neutralidad. Evitá juicios sobre personas.
- Usá español rioplatense neutro (vos/ustedes). Sé claro y concreto — evitá lenguaje corporativo vacío.
- En el turismo los plazos y los compromisos son críticos. Cuando aparezcan fechas, cantidades o condiciones en las notas, reflejalos con precisión.

## Tipos de reunión
Adaptá tu análisis según el tipo:
${instructionsList}

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
- Las acciones deben ser concretas y empezar con un verbo en infinitivo ("Coordinar...", "Confirmar...", "Enviar...", "Revisar..."). Si se mencionó un responsable, incluilo.
- El resumen debe capturar los temas principales, las decisiones tomadas y el tono general del encuentro.
- Si las notas son muy breves o poco claras, generá lo que puedas sin inventar información. Preferí menos items de calidad que muchos genéricos.`
}
