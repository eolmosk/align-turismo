# Align — Documentación técnica

## 1. Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| UI | React 18 + Tailwind CSS 3 |
| Auth | NextAuth 4 (JWT, magic links) |
| DB / Storage | Supabase (Postgres + Storage + RLS) |
| IA (generación) | Anthropic Claude (`@anthropic-ai/sdk`) — modelo Sonnet 4 |
| IA (embeddings) | OpenAI `text-embedding-3-small` (via fetch, sin SDK) |
| Vector search | pgvector en Supabase (cosine similarity) |
| Email | Resend |
| Cron | Vercel Cron (`vercel.json`) |
| PWA | Service worker manual (`public/sw.js`) + `public/manifest.json` |
| Hosting | Vercel |
| Iconos | lucide-react |
| Fechas | date-fns |

Ver `package.json` para versiones exactas.

## 2. Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                    # Landing pública
│   ├── auth/                       # Magic link sign-in
│   ├── onboarding/                 # Primer ingreso
│   ├── (protected)/                # Rutas autenticadas
│   │   ├── layout.tsx              # Wrapper max-w-5xl + AppFooter
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Dashboard principal
│   │   │   └── group/page.tsx      # Panel owner multi-escuela
│   │   ├── meeting/[id]/page.tsx
│   │   ├── meeting/new/page.tsx
│   │   ├── thread/[id]/page.tsx
│   │   ├── contacts/page.tsx
│   │   ├── users/page.tsx
│   │   └── admin/page.tsx
│   └── api/                        # API routes
│       ├── auth/[...nextauth]/
│       ├── ai/generate/            # Endpoint IA (Claude)
│       ├── meetings/
│       ├── threads/
│       ├── schools/                # GET + switch escuela activa
│       ├── invitations/
│       ├── onboarding/
│       ├── admin/
│       └── ...
├── components/
│   ├── SchoolSwitcher.tsx
│   ├── AppFooter.tsx
│   ├── SchoolLogo.tsx
│   └── ...
├── lib/
│   ├── auth.ts                     # NextAuth config
│   └── supabase.ts                 # Clientes supabase
└── types/
    └── index.ts                    # Tipos + labels/constantes
supabase/
└── migrations/
    ├── 001_schema.sql
    ├── 002_onboarding.sql
    ├── 003_threads.sql
    ├── 008_user_schools.sql
    ├── 009_school_branding.sql
    └── 011_embeddings.sql
```

## 3. Modelo de datos

Tablas principales:

- **`schools`** — una por institución. Tiene `group_id` (agrupa escuelas bajo un owner) y campos de branding (`logo_url`, `brand_color`).
- **`users`** — cuenta de usuario. `school_id` apunta a la **escuela activa**; `role` al rol en esa escuela.
- **`user_schools`** — membresía many-to-many entre `users` y `schools` con `role` por escuela. Permite multi-escuela.
- **`threads`** — agrupa reuniones relacionadas.
- **`meetings`** — cada reunión. Campos clave: `title`, `meeting_date`, `type`, `content`, `participants`, `thread_id`, `school_id`, `ai_questions` (JSONB), `ai_summary`.
- **`actions`** — pending actions derivadas de reuniones. `status`, `due_date`, `assignee`.
- **`contacts`** — agenda de la escuela.
- **`invitations`** — invitaciones pendientes por email.
- **`meeting_history`** — auditoría de cambios.
- **`meeting_embeddings`** — vector `VECTOR(1536)` por reunión, generado con `text-embedding-3-small`. Soporta búsqueda semántica vía la función RPC `match_meetings(query_embedding, school_id_filter, match_count)`. Para volúmenes chicos (<1000 filas) se recomienda NO usar índice IVFFlat — con lists alto y pocas filas muchos clusters quedan vacíos y la búsqueda devuelve 0 resultados. Crear el índice recién al crecer, con `lists ≈ sqrt(N)`.

Row Level Security (RLS) está activo en todas las tablas: cada query se filtra por `school_id` del usuario autenticado.

## 4. Autenticación

NextAuth con estrategia JWT y magic link por email (Resend).

- `src/lib/auth.ts` define los callbacks.
- El callback `session` inyecta `school_id`, `role`, `school.name`, `school.group_name`, `school.group_id` en `session.user`.
- Cambiar de escuela activa = `POST /api/schools/switch` → actualiza `users.school_id` y `users.role` → el próximo token JWT refleja el cambio.

## 5. API routes (selección)

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/meetings` | GET, POST | Listar / crear reuniones |
| `/api/meetings/[id]` | GET, PATCH, DELETE | CRUD de reunión |
| `/api/meetings/[id]/actions` | GET, POST | Acciones de la reunión |
| `/api/threads` | GET, POST | Hilos |
| `/api/threads/pending` | GET | Hilos con acciones abiertas |
| `/api/ai/generate` | POST | Procesar minuta con Claude |
| `/api/schools` | GET | Escuelas del usuario |
| `/api/schools/switch` | POST | Cambiar escuela activa |
| `/api/invitations` | POST | Crear invitación |
| `/api/invitations/accept` | POST | Aceptar invitación |
| `/api/onboarding` | POST | Crear escuela + user_school |
| `/api/admin/users` | GET, POST, DELETE | Gestión usuarios (owner) |
| `/api/group/schools` | GET | Agregado multi-escuela (owner) |
| `/api/search` | GET | Búsqueda global (texto) |
| `/api/ask` | POST | Búsqueda conversacional: embed + `match_meetings` + Claude |
| `/api/embeddings/backfill` | POST | Indexa reuniones pendientes (idempotente, `maxDuration=300`) |
| `/api/transcribe` | POST | Recibe blob de audio (FormData `file`), reenvía a Whisper (`whisper-1`, `language=es`), devuelve `{ text }`. Límite 25 MB. Sin persistencia. |
| `/api/digest/weekly` | POST | Envío del digest semanal (Vercel cron, lunes) |

Todas las rutas protegidas validan `getServerSession(authOptions)` y filtran por `school_id`.

## 6. IA — `/api/ai/generate`

- Modelo: `claude-sonnet-4-20250514`.
- System prompt con contexto sensible al ámbito escolar, tipo de reunión, y formato de salida JSON estricto.
- Input: contenido crudo de la minuta + tipo de reunión + contexto del hilo.
- Output: `{ summary, actions[], questions[] }`.
- Editable por el usuario antes de persistir.

## 6.1 PWA

- **`public/manifest.json`**: nombre, íconos, `display: standalone`, `start_url: /dashboard`, theme color `#e11d48`, shortcuts a "Nueva reunión" y "Hoy".
- **`public/sw.js`**: service worker manual (~60 líneas). Precachea `/`, manifest y el ícono. Estrategia:
  - `/api/*` y `/auth/*` → nunca cachear, siempre network.
  - Navigations → network-first, fallback a `/` cacheado si no hay conexión.
  - Assets estáticos (`_next/static`, imágenes, fuentes, css, js) → cache-first.
  - Versionado con `CACHE_VERSION` para invalidar al deployar.
- **`ServiceWorkerRegister`** (client component en `layout.tsx`): registra `/sw.js` solo en producción (en dev se salta para evitar caches confusas).
- **Meta tags**: `metadata.manifest`, `metadata.appleWebApp`, `viewport.themeColor` en `src/app/layout.tsx`.

## 6.2 Búsqueda conversacional — `/api/ask`

Flujo:
1. Embed de la pregunta con `text-embedding-3-small` (1536 dims) vía `src/lib/embeddings.ts`.
2. RPC `match_meetings` devuelve top 5 reuniones por similitud coseno filtradas por `school_id`.
3. Se arma un contexto con cada reunión (`[Reunión N]` + metadata + resumen + compromisos + notas truncadas a 2000 chars).
4. Claude Sonnet 4 responde en español rioplatense, citando `[Reunión N]`, limitado a 800 tokens.
5. Se devuelve `{ answer, sources[] }`.

Los embeddings se generan fire-and-forget en POST `/api/meetings` y PATCH `/api/meetings/[id]` (cuando cambian campos de contenido). `upsertMeetingEmbedding` nunca lanza — loguea y sigue. Backfill vía `/api/embeddings/backfill`.

## 7. Variables de entorno

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Resend (magic links + emails)
RESEND_API_KEY=
EMAIL_FROM=

# Anthropic
ANTHROPIC_API_KEY=

# OpenAI (embeddings para búsqueda conversacional)
OPENAI_API_KEY=

# Landing pública (solo server)
CONTACT_WHATSAPP=
CONTACT_CALENDLY=
```

`CONTACT_WHATSAPP` y `CONTACT_CALENDLY` se leen únicamente en Server Components; nunca llegan al cliente.

## 8. Setup local

```bash
# 1. Clonar
git clone <repo>
cd minutas-app

# 2. Dependencias
npm install

# 3. Variables
cp .env.example .env.local
# completar credenciales

# 4. Base de datos
# Aplicar migraciones en orden desde supabase/migrations/ via Supabase SQL editor

# 5. Dev
npm run dev
# http://localhost:3000
```

## 9. Deployment

- Hosting en Vercel, conectado al repo de GitHub.
- Branch `main` → producción (`align.frameops.net`).
- Variables de entorno configuradas en el dashboard de Vercel.
- Migraciones se aplican **manualmente** en Supabase antes de deployar cambios que dependan de ellas.
- `pitch-deck.html` está en `.gitignore` y no se despliega.

## 10. Checks antes de deployar

```bash
npx tsc --noEmit   # type check
npm run lint
npm run build      # valida build de producción
```

## 11. Consideraciones de seguridad

- RLS activo en todas las tablas con políticas por `school_id`.
- Service role key solo en server (nunca expuesta al cliente).
- Magic links con expiración corta.
- Datos sensibles (minutas, audios) aislados por escuela.
- Cookies con `httpOnly`, `secure` en prod.
- CSP configurado por Next defaults.
