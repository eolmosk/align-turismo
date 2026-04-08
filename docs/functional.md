# Align — Documentación funcional

## 1. Visión

Align es una plataforma web para que **escuelas** gestionen sus reuniones: tomar minutas, hacer seguimiento de acuerdos, y mantener la continuidad entre reuniones con ayuda de IA.

El problema que resuelve: las reuniones escolares (con familias, equipos pedagógicos, disciplinarias) generan muchos acuerdos y acciones que luego se pierden. Nadie recuerda qué se habló la vez anterior, quién quedó a cargo de qué, ni qué quedó pendiente.

## 2. Usuarios

| Rol | Qué hace |
|-----|----------|
| **Owner** | Administra una o varias escuelas del grupo. Gestiona usuarios, branding, ve métricas agregadas. |
| **Director** | Lidera la institución. Crea reuniones, revisa hilos, ve acciones abiertas. |
| **Coordinador** | Gestiona reuniones de su área. Similar al director dentro de su alcance. |
| **Docente** | Participa en reuniones, ve las propias, cumple acciones asignadas. |

Un mismo usuario puede tener roles diferentes en distintas escuelas (gracias a `user_schools`).

## 3. Features

### 3.1 Autenticación sin contraseña
Magic link por email. Reduce fricción, sin contraseñas olvidadas.

### 3.2 Onboarding guiado
Primera vez: nombre de escuela, rol, datos básicos → listo para usar.

### 3.3 Dashboard
Punto de entrada. Muestra:
- Estadísticas de la escuela activa (reuniones, hilos, acciones pendientes).
- Hilos con actividad reciente.
- Acciones abiertas.
- Accesos rápidos a crear reunión, hilo, contacto.

### 3.4 Hilos (Threads)
Agrupan reuniones relacionadas. Permiten seguir un caso, un grupo, una familia, una comisión a lo largo del tiempo.

### 3.5 Reuniones
- Creación manual o a partir de audio/texto pegado.
- Tipos: pedagógica, familia, disciplinaria, administrativa, equipo.
- Asociables a un hilo.
- Participantes desde la agenda de contactos.

### 3.6 IA — resumen y extracción
Botón "Generar con IA" dentro de una reunión:
- Resume la reunión.
- Extrae **acciones pendientes** con responsable sugerido.
- Genera **preguntas de seguimiento** para la próxima reunión del hilo.
- Todo es editable antes de guardar.

El prompt es sensible al **tipo de reunión** y al **contexto del hilo**.

### 3.7 Acciones pendientes
Cada acción tiene descripción, responsable, fecha, estado. Se listan por reunión, por hilo y por escuela.

### 3.8 Contactos
Agenda de familias, docentes y referentes. Importable desde CSV. Usados como participantes.

### 3.9 Búsqueda global
Busca en títulos, contenidos, participantes, acciones.

### 3.10 Multi-escuela
Un usuario puede pertenecer a varias escuelas. Cambia entre ellas con el **SchoolSwitcher** en el header. Cada escuela es un espacio aislado.

### 3.11 Panel de grupo (owner)
`/dashboard/group`. Vista consolidada de todas las escuelas del grupo: totales, filtros, navegación cruzada.

### 3.12 Administración
`/admin`: gestión de usuarios, invitaciones por email, escuelas, branding (logo + color).

### 3.13 Branding por escuela
Cada escuela puede subir su logo y definir un color principal; la app adapta la UI.

### 3.14 Inbox "Hoy"
Tab del Dashboard que consolida la vista diaria del usuario: acciones asignadas a él (o todas, según filtro), reuniones próximas y reuniones sin procesar con IA. Pensado como landing matutina. Las acciones soportan asignación estructurada (contacto o usuario) además del texto libre heredado.

### 3.15 Digest semanal por email
Cada lunes se envía un resumen semanal a cada usuario activo: reuniones próximas, reuniones sin IA, y sus pendientes (hasta 8). El subject prioriza reuniones sobre pendientes para evitar empezar la semana con una cifra abrumadora. Implementado como cron de Vercel.

### 3.16a Audio HD con transcripción (Whisper)
Nuevo modo de entrada "Audio HD" en `/meeting/new`: graba con `MediaRecorder` del navegador, al detener envía el blob a `/api/transcribe` que lo reenvía a OpenAI Whisper (`whisper-1`, `language: es`) y devuelve el texto. El texto se agrega al campo de notas. Sin persistencia del audio (se descarta tras la transcripción). Funciona en Safari/iOS a diferencia del modo "Dictado" (Web Speech API). Límite 25 MB por grabación.

### 3.16 PWA instalable
Align se puede instalar en Android/iOS como app (agregar a pantalla de inicio). Corre en modo standalone (sin barra del navegador), con ícono propio, splash y color de tema. Service worker mínimo cachea assets estáticos para carga rápida; las APIs siempre van a red para no mostrar datos viejos. Shortcuts: "Nueva reunión" y "Hoy" desde la home del sistema.

### 3.17 Preguntar — búsqueda conversacional
Tab del Dashboard donde el usuario hace preguntas en lenguaje natural sobre el historial de reuniones. El sistema embebe la pregunta, busca por similitud semántica en los embeddings de las reuniones de la escuela, y Claude responde citando las fuentes. Limitado a 500 caracteres por pregunta, top 5 reuniones como contexto, respuestas de 2-4 párrafos.

## 4. Flujos principales

### 4.1 Alta de un nuevo cliente (escuela)
1. Owner se registra → onboarding crea `school` + `user_school`.
2. Invita a director, coordinadores, docentes.
3. Configura branding.
4. Importa contactos iniciales.

### 4.2 Reunión típica con seguimiento
1. Director crea reunión en el hilo "Familia X".
2. Carga minuta (texto o audio).
3. Ejecuta "Generar con IA" → obtiene resumen, acciones y preguntas.
4. Edita y guarda.
5. Acciones quedan abiertas en el dashboard, asignadas al responsable.
6. Próxima reunión del hilo: las preguntas de seguimiento aparecen como contexto.
7. Cierre de acciones a medida que se completan.

### 4.3 Usuario multi-escuela
1. Usuario está en Escuela A (activa).
2. Recibe invitación para Escuela B → acepta → queda en `user_schools` sin perder A.
3. Abre el SchoolSwitcher → elige B → dashboard se recarga con datos de B.

### 4.4 Invitación
1. Owner crea invitación en `/admin`.
2. Sistema envía email con link único.
3. Invitado entra → autentica → `/api/invitations/accept` lo vincula a la escuela.

## 5. Tipos de reunión y comportamiento de IA

| Tipo | Color | Foco de la IA |
|------|-------|---------------|
| Pedagógica | — | Estrategias, aprendizajes, seguimiento académico |
| Familia | — | Acuerdos con tutores, comunicación, próximos pasos |
| Disciplinaria | — | Hechos, acuerdos, consecuencias, responsables |
| Administrativa | — | Decisiones, plazos, responsables |
| Equipo | — | Coordinación interna, distribución de tareas |

(Los colores se definen en `MEETING_TYPE_DOT` en `src/types`.)

## 6. Casos de uso destacados

- **Seguimiento de una familia a lo largo del año** — un hilo acumula reuniones + acciones + historia; cualquier docente nuevo se pone al día leyendo el hilo.
- **Reuniones de equipo semanales** — acciones quedan trazables, ya no se pierden en cuadernos.
- **Coordinación multi-sede** — un director regional ve todas las escuelas en un panel único.
- **Continuidad entre directores** — al cambiar el equipo de conducción, la memoria institucional queda en la plataforma.

## 7. Fuera del alcance actual (roadmap)

- Exportación masiva (PDF/Word) de reuniones y hilos.
- Notificaciones push / recordatorios automáticos de acciones.
- Integración con Google Calendar (parcial hoy, completa en roadmap).
- Dashboard analítico avanzado con tendencias.
- App móvil nativa.

## 8. Principios de producto

1. **Privacidad primero** — cada escuela ve solo sus datos, RLS a nivel DB.
2. **IA como asistente, no como autoridad** — todo lo que genera la IA es editable.
3. **Minimalismo funcional** — si algo no se usa, se quita. La UI debe ser usable por un director que no es "techie".
4. **Continuidad institucional** — el valor aparece en la reunión N+1, no en la primera.
