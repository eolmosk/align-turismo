# Gestor de Reuniones — Director Escolar

Sistema de gestión de minutas con IA para directores escolares. Stack: Next.js 14, Supabase, Google OAuth, Anthropic Claude API, desplegado en Vercel.

---

## Setup en 4 pasos

### 1. Clonar e instalar

```bash
git clone <tu-repo>
cd minutas-app
npm install
cp .env.local.example .env.local
```

### 2. Supabase

1. Crear proyecto en https://app.supabase.com (gratis)
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/migrations/001_schema.sql`
3. Copiar en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project Settings → API → Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API → anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → service_role key)

### 3. Google Cloud

1. Ir a https://console.cloud.google.com → Crear proyecto
2. **APIs & Services → Enable APIs**: habilitar estas tres:
   - Google Calendar API
   - Google Drive API
   - Google Docs API
3. **APIs & Services → Credentials → Create OAuth 2.0 Client**
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (desarrollo)
     - `https://tu-dominio.vercel.app/api/auth/callback/google` (producción)
4. Copiar en `.env.local`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

### 4. Anthropic API

1. Crear cuenta en https://console.anthropic.com
2. Crear API key
3. Copiar en `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`

> **Costo estimado**: ~$1–3 USD/mes por escuela activa con uso normal (Claude Sonnet).

---

## Desarrollo local

```bash
npm run dev
# → http://localhost:3000
```

---

## Deploy en Vercel

```bash
npm install -g vercel
vercel
```

Luego en el dashboard de Vercel → Settings → Environment Variables, cargar todas las variables de `.env.local`.

Actualizar la redirect URI de Google con el dominio de Vercel.

---

## Agregar una escuela y asignar director

Después de que el director haga login por primera vez, su usuario queda creado en Supabase. Para asignarle una escuela:

```sql
-- En Supabase SQL Editor

-- 1. Ver usuarios creados
SELECT id, email, name, school_id, role FROM users;

-- 2. Asignar escuela al director (reemplazar los UUIDs)
UPDATE users
SET school_id = '11111111-1111-1111-1111-111111111111'
WHERE email = 'director@escuela.edu.uy';

-- 3. Para hacer un usuario admin del grupo
UPDATE users
SET role = 'admin_group'
WHERE email = 'admin@grupo.edu.uy';

-- 4. Crear nueva escuela
INSERT INTO schools (name, group_name)
VALUES ('Escuela San Martín', 'Red Educativa Norte');
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # Google OAuth
│   │   ├── meetings/             # CRUD reuniones
│   │   ├── ai/generate/          # Claude API
│   │   ├── google/               # Calendar + Drive
│   │   └── group/schools/        # Panel multi-escuela
│   ├── auth/                     # Página de login
│   ├── dashboard/                # Dashboard director
│   │   └── group/                # Panel admin grupo
│   └── meeting/
│       ├── new/                  # Nueva minuta
│       └── [id]/                 # Detalle + seguimiento
├── lib/
│   └── supabase.ts              # Cliente Supabase
└── types/
    └── index.ts                  # Tipos TypeScript
supabase/
└── migrations/
    └── 001_schema.sql            # Esquema completo BD
```

---

## Modelo de precios sugerido

| | Setup (único) | Mensual |
|---|---|---|
| 1 escuela (piloto) | USD 350 | USD 45/mes |
| Grupo 10 escuelas | USD 2.500 | USD 380/mes |

Costos de infraestructura por escuela: ~$1-3/mes (API Claude) + $0 (Vercel + Supabase free tier).

---

## Funcionalidades MVP

- [x] Login con Google OAuth
- [x] Minutas por texto, voz (Web Speech API) o archivo
- [x] Generación de seguimiento con Claude (preguntas + compromisos + resumen)
- [x] Checklist de acciones interactivo
- [x] Integración Google Calendar (aviso 15 min antes)
- [x] Integración Google Drive (guarda minuta como Doc)
- [x] Panel multi-escuela para admin de grupo
- [x] Row Level Security por escuela (Supabase RLS)

## Roadmap post-MVP

- [ ] Notificaciones por email (Resend)
- [ ] Búsqueda full-text en minutas
- [ ] Exportación a PDF
- [ ] App móvil (React Native / Expo)
- [ ] Dashboard de analytics por tipo de reunión
