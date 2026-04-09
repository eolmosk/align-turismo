export type MeetingType = 'docentes' | 'padres' | 'individual' | 'direccion'
export type InputMethod = 'text' | 'voice' | 'file' | 'audio'
export type UserRole = 'owner' | 'director' | 'vicedirector' | 'coordinador' | 'docente' | 'administrativo' | 'pending'
export type UserStatus = 'active' | 'pending' | 'rejected'
export type MeetingTopic = 'pedagógico' | 'disciplinario' | 'familiar' | 'institucional' | 'curricular' | 'administrativo'

export const TOPIC_LABELS: Record<MeetingTopic, string> = {
  'pedagógico':    'Pedagógico',
  'disciplinario': 'Disciplinario',
  'familiar':      'Familiar',
  'institucional': 'Institucional',
  'curricular':    'Curricular',
  'administrativo':'Administrativo',
}

export const TOPICS: MeetingTopic[] = ['pedagógico', 'disciplinario', 'familiar', 'institucional', 'curricular', 'administrativo']

export interface Contact {
  id: string
  school_id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  external_id: string | null
  source: 'manual' | 'csv' | 'handing'
  metadata: Record<string, string> | null
  created_at: string
  updated_at: string
}

export interface School {
  id: string
  name: string
  group_name: string | null
  created_at: string
}

export interface User {
  onboarded?: boolean
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: UserRole
  status: UserStatus
  school_id: string | null
  requested_school_name: string | null
  created_at: string
}

export interface Thread {
  id: string
  school_id: string
  user_id: string
  name: string
  type: MeetingType
  participants: string | null
  description: string | null
  archived: boolean
  last_meeting_at: string | null
  course: string | null
  subject: string | null
  academic_year: number | null
  tags: string[] | null
  topics: MeetingTopic[] | null
  created_at: string
  contacts?: Contact[]
}

export interface Meeting {
  id: string
  school_id: string
  user_id: string
  thread_id: string | null
  title: string
  type: MeetingType
  meeting_date: string
  next_date: string | null
  next_time: string | null
  next_duration: number | null
  participants: string | null
  notes: string
  input_method: InputMethod
  ai_questions: string[] | null
  ai_commitments: string[] | null
  ai_summary: string | null
  calendar_event_id: string | null
  drive_doc_id: string | null
  drive_doc_url: string | null
  course: string | null
  subject: string | null
  academic_year: number | null
  tags: string[] | null
  topics: MeetingTopic[] | null
  created_at: string
  updated_at: string
  // joined
  school?: School
  actions?: MeetingAction[]
  contacts?: Contact[]
  _visibility?: 'full' | 'summary_actions' | 'metadata_only'
}

export interface MeetingAction {
  id: string
  meeting_id: string
  text: string
  done: boolean
  done_at: string | null
  assigned_to: string | null
  created_at: string
}

export interface CreateMeetingInput {
  title: string
  type: MeetingType
  meeting_date: string
  next_date?: string
  next_time?: string
  next_duration?: number
  participants?: string
  notes: string
  input_method: InputMethod
  thread_id?: string
  course?: string
  subject?: string
  academic_year?: number
  tags?: string[]
}

export interface AIGenerateResponse {
  questions: string[]
  commitments: string[]
  summary: string
  actions: string[]
}

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  docentes: 'Docentes',
  padres: 'Padres / Familias',
  individual: 'Individual (1:1)',
  direccion: 'Dirección',
}

export const MEETING_TYPE_COLORS: Record<MeetingType, string> = {
  docentes: 'bg-brand-50 text-brand-700 border-brand-200',
  padres: 'bg-warm-50 text-warm-700 border-warm-200',
  individual: 'bg-brand-100 text-brand-600 border-brand-200',
  direccion: 'bg-warm-100 text-warm-600 border-warm-200',
}

export const MEETING_TYPE_DOT: Record<MeetingType, string> = {
  docentes: 'bg-brand',
  padres: 'bg-warm-400',
  individual: 'bg-brand-300',
  direccion: 'bg-warm-300',
}
