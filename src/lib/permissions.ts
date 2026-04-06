import { UserRole } from '@/types'

// Roles con acceso de gestión (pueden aprobar usuarios, invitar, cambiar roles)
export const MANAGE_USERS_ROLES: UserRole[] = ['owner', 'director']

// Roles que ven todas las reuniones de la escuela (no solo las propias)
export const SEE_ALL_MEETINGS_ROLES: UserRole[] = ['owner', 'director', 'vicedirector', 'coordinador']

// Roles que ven estadísticas (propias o de toda la escuela según el rol)
export const SEE_STATS_ROLES: UserRole[] = ['owner', 'director', 'vicedirector', 'coordinador']

// Roles que pueden ver todas las escuelas del grupo
export const SEE_GROUP_DATA_ROLES: UserRole[] = ['owner']

export function canManageUsers(role: UserRole): boolean {
  return MANAGE_USERS_ROLES.includes(role)
}

export function canSeeAllMeetings(role: UserRole): boolean {
  return SEE_ALL_MEETINGS_ROLES.includes(role)
}

export function canSeeStats(role: UserRole): boolean {
  return SEE_STATS_ROLES.includes(role)
}

export function canSeeGroupData(role: UserRole): boolean {
  return SEE_GROUP_DATA_ROLES.includes(role)
}
