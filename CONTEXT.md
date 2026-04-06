# Gestor de Reuniones — Contexto del Proyecto

## Qué es esto
Aplicación web para directores escolares en Uruguay. Permite registrar minutas de reuniones, generar guías de seguimiento con IA, organizar reuniones en hilos de conversación, y conectar con Google Calendar y Drive.

Se vende a escuelas privadas como SaaS. El caso inicial es un grupo de 10 escuelas.

---

## Stack técnico
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Base de datos**: Supabase (PostgreSQL + Auth + RLS)
- **Autenticación**: NextAuth v4 con Google OAuth
- **IA**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Emails**: Resend (configurado pero pendiente de activar)
- **Deploy**: Vercel (con Cron Jobs para recordatorios)
- **Integraciones**: Google Calendar API, Google Drive API, Google Docs API

---

## Estructura de carpetas
```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/     # Google OAuth
│   │   ├── meetings/               # CRUD reuniones
│   │   ├── threads/                # CRUD hilos
│   │   ├── search/                 # Búsqueda full-text
│   │   ├── stats/                  # Estadísticas con IA
│   │   ├── users/                  # Gestión de usuarios
│   │   ├── invitations/            # Invitaciones por email
│   │   ├── onboarding/             # Setup inicial + solicitud acceso
│   │   ├── google/                 # Calendar + Drive + listar calendarios
│   │   ├── ai/generate/            # Claude API → seguimiento
│   │   ├── email/send/             # Envío manual de recordatorio
│   │   └── cron/reminders/         # Job diario 8am
│   ├── dashboard/                  # Dashboard con 3 tabs: Hilos · Reuniones · Stats
│   ├── thread/[id]/                # Detalle de hilo + guía de seguimiento
│   ├── meeting/
│   │   ├── new/                    # Nueva reunión (con selector de hilo)
│   │   └── [id]/                   # Detalle reunión + Calendar + Drive
│   ├── onboarding/                 # Setup director O solicitud de acceso
│   ├── users/                      # Panel gestión usuarios (solo director/owner)
│   └── auth/                       # Login con Google
├── lib/
│   ├── supabase.ts                 # Cliente Supabase (browser + admin)
│   ├── permissions.ts              # Roles y permisos centralizado
│   └── email/reminder.ts           # Template HTML de email
└── types/
    └── index.ts                    # Tipos TypeScript + constantes de roles
```

---

## Modelo de datos (Supabase)

### schools
```sql
id, name, group_name, created_at
```

### users
```sql
id, email, name, avatar_url, role, status, school_id,
onboarded, requested_school_name, google_refresh_token, created_at
```
- **role**: `owner | director | vicedirector | coordinador | docente | administrativo | pending`
- **status**: `active | pending | rejected`

### threads (hilos de seguimiento)
```sql
id, school_id, user_id, name, type, participants,
description, archived, last_meeting_at, created_at
```
- **type**: `docentes | padres | individual | direccion`

### meetings
```sql
id, school_id, user_id, thread_id,
title, type, meeting_date, next_date, next_time, next_duration,
participants, notes, input_method, is_live_transcript,
ai_questions[], ai_commitments[], ai_summary,
calendar_event_id, drive_doc_id, drive_doc_url,
created_at, updated_at
```

### meeting_actions
```sql
id, meeting_id, text, done, done_at, created_at
```

### invitations
```sql
id, school_id, invited_by, email, role, token, accepted, created_at, expires_at
```

---

## Roles y permisos

| Rol | Ve reuniones | Ve stats | Gestiona usuarios |
|-----|-------------|----------|-------------------|
| owner | Todas las escuelas del grupo | Todo el grupo | Sí |
| director | Su escuela | Su escuela | Sí |
| vicedirector | Su escuela | Su escuela | No |
| coordinador | Su escuela | Su escuela | No |
| docente | Solo las propias | Solo las propias | No |
| administrativo | Solo las propias | Solo las propias | No |

Archivo centralizado: `src/lib/permissions.ts`

---

## Flujos principales

### Onboarding — dos caminos
1. **Director nuevo**: configura escuela → explica funciones → crea primera reunión demo
2. **Usuario existente**: escribe nombre de escuela → queda `status: pending` → director aprueba en `/users`

### Invitación
Director genera link desde `/users` → usuario abre link → acepta con Google → queda activo automáticamente

### Registro de reunión
1. Director elige hilo existente O crea reunión suelta
2. Ingresa notas (texto / voz / archivo / grabación en vivo)
3. Al guardar → IA genera preguntas + compromisos + resumen en background
4. Director puede agendar en Calendar y guardar en Drive

### Seguimiento
- Cada hilo muestra la guía de la última reunión: preguntas, compromisos, acciones pendientes
- Botón "Ver otros temas abiertos" muestra otros hilos con pendientes
- El evento de Calendar incluye link al hilo + guía completa en descripción

---

## Variables de entorno necesarias
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL
RESEND_API_KEY          # pendiente de configurar
RESEND_FROM_EMAIL       # pendiente de configurar
CRON_SECRET             # pendiente de configurar
```

---

## Estado actual — qué funciona

✅ Login con Google OAuth
✅ Onboarding director (setup escuela)
✅ Solicitud de acceso para otros roles
✅ Gestión de usuarios (aprobar, invitar, cambiar rol)
✅ CRUD de hilos y reuniones
✅ Entrada por texto, voz (dictado), grabación en vivo, archivo
✅ IA genera seguimiento automático (Claude API)
✅ Historial entre reuniones del mismo hilo
✅ Google Calendar (con selector de calendario)
✅ Google Drive (carpetas organizadas: Escuela/Tipo/Año)
✅ Dashboard con 3 tabs: Hilos, Reuniones, Estadísticas
✅ Búsqueda y filtros en tab Reuniones
✅ Estadísticas: reuniones por mes, participantes, palabras frecuentes, temas IA
✅ Cerrar sesión

---

## Lo que falta construir (en orden)

### 1. SQL migración 005 — campos nuevos
Agregar a `threads` y `meetings`:
- `course` TEXT (ej: "1ro A", "2do B")
- `subject` TEXT (ej: "Matemáticas", "Lengua")
- `academic_year` INT (ej: 2026)
- `tags` TEXT[] (etiquetas libres)

### 2. Kanban de reuniones
- Tab "Reuniones" pasa de lista a vista kanban
- 4 columnas: Docentes · Padres · Individual · Dirección
- Cards con título, participante, fecha, hilo si tiene
- Búsqueda superior filtra todas las columnas
- Filtros: curso, materia, año lectivo, tag, sin hilo

### 3. Formularios actualizados
- Nueva reunión: agregar campos curso, materia, año, tags
- Nuevo hilo: agregar curso, materia, año, tags
- Autocompletado de cursos (lista los que ya existen en la escuela)

### 4. Estadísticas con visualización por rol
- Director/Vice/Coordinador: ve toda la escuela
- Docente/Administrativo: ve solo lo propio
- Gráficos con Chart.js: barras por mes, nube de palabras visual
- Filtros por curso y materia

### 5. Flujo end-to-end sin SQL manual
- El primer usuario de una escuela queda automáticamente como director
- Onboarding completo sin intervención de SQL
- Estados edge case manejados: escuela no encontrada, invitación expirada, etc.

### 6. Mejoras de UX pendientes
- Estados vacíos con CTA claros en todas las pantallas
- Manejo de errores visible al usuario (no solo en consola)
- Loading states consistentes
- Responsive móvil revisado

---

## Migraciones SQL ejecutadas
- `001_schema.sql` — esquema base
- `002_onboarding.sql` — columna onboarded en users
- `003_threads.sql` — tabla threads + thread_id en meetings
- `004_roles.sql` — roles, invitaciones, status en users

## Próxima migración pendiente
- `005_metadata.sql` — course, subject, academic_year, tags

---

## Cómo arrancar una sesión de Claude Code
```bash
cd C:\Users\User\Documents\FrameOps\PRODUCTOS\Escuela\minutas-app
claude
```

Prompt de inicio sugerido:
```
Leé el archivo CONTEXT.md para entender el proyecto completo.
Luego hacé un diagnóstico: listá las rutas API existentes,
verificá que compila sin errores con npm run build,
y decime si el estado del código coincide con lo documentado.
```

---

## Convenciones de código
- Rutas API en `src/app/api/*/route.ts`
- Siempre verificar sesión y permisos al inicio de cada route handler
- Usar `supabaseAdmin` en el server, `supabase` en el cliente
- Permisos centralizados en `src/lib/permissions.ts` — no hardcodear roles en las páginas
- Los tipos van en `src/types/index.ts`
- Tailwind para estilos, sin CSS modules
