import type { UserRole } from '@/types'

export type MeetingVisibility = 'full' | 'summary_actions' | 'metadata_only' | 'none'

const LEADERSHIP_ROLES: UserRole[] = ['owner', 'director', 'vicedirector']

interface VisibilityInput {
  userRole: UserRole
  userId: string
  meetingUserId: string   // creator
  isParticipant: boolean  // in meeting_participants table
}

/**
 * Determina el nivel de visibilidad de un usuario sobre una reunión.
 *
 * | Rol             | Creó      | Participa       | Ni crea ni participa |
 * |-----------------|-----------|-----------------|----------------------|
 * | Owner/Director  | full      | full            | metadata_only        |
 * | Coordinador     | full      | full            | none                 |
 * | Docente/Admin   | full      | summary_actions | none                 |
 */
export function getMeetingVisibility(input: VisibilityInput): MeetingVisibility {
  const { userRole, userId, meetingUserId, isParticipant } = input

  const isCreator = userId === meetingUserId

  if (isCreator) return 'full'

  if (isParticipant) {
    if (LEADERSHIP_ROLES.includes(userRole) || userRole === 'coordinador') return 'full'
    return 'summary_actions'
  }

  // Neither created nor participates
  if (LEADERSHIP_ROLES.includes(userRole)) return 'metadata_only'
  return 'none'
}

/** Campos que se devuelven según nivel de visibilidad */
const METADATA_FIELDS = ['id', 'school_id', 'user_id', 'thread_id', 'title', 'type', 'meeting_date', 'participants', 'created_at', 'updated_at', 'meeting_contacts'] as const
const SUMMARY_FIELDS = [...METADATA_FIELDS, 'ai_summary', 'meeting_actions', 'next_date', 'next_time', 'next_duration', 'course', 'subject', 'academic_year', 'tags', 'topics'] as const

export function stripMeetingFields(meeting: any, visibility: MeetingVisibility): any {
  if (visibility === 'full') return { ...meeting, _visibility: 'full' }

  const allowedFields = visibility === 'summary_actions' ? SUMMARY_FIELDS : METADATA_FIELDS
  const stripped: any = { _visibility: visibility }
  for (const field of allowedFields) {
    if (field in meeting) stripped[field] = meeting[field]
  }
  // Rename actions key if present
  if (visibility === 'summary_actions' && meeting.meeting_actions) {
    stripped.meeting_actions = meeting.meeting_actions
  }
  return stripped
}
