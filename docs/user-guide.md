# Align — Guía de usuario

Align es una plataforma para que directores, coordinadores y docentes gestionen las reuniones de la escuela: toman minutas, hacen seguimiento de acciones, y usan IA para no perder de vista lo importante.

---

## 1. Empezar

### 1.1 Crear cuenta
1. Ingresá a **align.frameops.net** y hacé clic en **Agendar demo** o **Iniciar sesión**.
2. Iniciá sesión con tu email.
3. La primera vez vas a ver el **onboarding**: nombre de tu escuela, tu rol, y datos básicos.
4. Al terminar caés en el **Dashboard**.

### 1.2 Roles
- **Owner** — administra el grupo de escuelas, ve el panel de grupo (`/dashboard/group`) y puede administrar usuarios desde `/admin`.
- **Director / Coordinador** — gestiona reuniones, hilos, contactos y acciones.
- **Docente** — participa en reuniones, ve las que le corresponden y sus acciones pendientes.

### 1.3 Multi-escuela
Si trabajás en más de una escuela, en el header del Dashboard vas a ver un **selector** con tu escuela activa. Al hacer clic podés cambiar entre escuelas; los datos se recargan automáticamente.

---

## 2. Hilos (Threads)

Un **hilo** agrupa reuniones relacionadas (ej: "Seguimiento 3° B", "Comisión de convivencia", "Reuniones con familias de Juan Pérez").

### Crear un hilo
1. En el Dashboard, ir a **Hilos** → **Nuevo hilo**.
2. Título, descripción, tipo.
3. Guardar. Ahora podés agregarle reuniones.

### Ver un hilo
Entrás desde el Dashboard o desde `/thread/[id]`. Ves:
- Todas las reuniones del hilo ordenadas por fecha.
- Las acciones pendientes acumuladas.
- Resumen IA del hilo completo (cuando hay suficientes reuniones).

---

## 3. Reuniones

### 3.1 Crear una reunión
1. **+ Nueva reunión** desde el Dashboard o desde un hilo.
2. Completar: título, fecha, tipo (pedagógica, disciplinaria, familia, administrativa, etc.), participantes.
3. Agregar el contenido. Modos disponibles:
   - **Texto** — escribí o pegá la minuta.
   - **Dictado** — dictás y el navegador transcribe en vivo (gratis, solo Chrome).
   - **Archivo** — subís un `.txt` o `.pdf`.
   - **Audio HD** — grabás con el micrófono del celular/PC y al detener se transcribe con Whisper (más preciso, soporta español rioplatense, funciona en Safari/iOS). Límite 25 MB (~25 min).
   - **En vivo** — grabación durante la reunión con transcripción en tiempo real (Web Speech, solo Chrome).
4. Guardar.

### 3.2 Tipos de reunión
Cada tipo tiene un color y ajusta el comportamiento de la IA:
- **Pedagógica** — foco en aprendizaje, estrategias, plan.
- **Familia** — foco en comunicación, acuerdos con tutores.
- **Disciplinaria** — foco en acuerdos, consecuencias, seguimiento.
- **Administrativa** — foco en decisiones, plazos.
- **Equipo** — coordinación interna.

### 3.3 Procesar con IA
Dentro de una reunión, botón **Generar con IA**. La IA:
- Resume la reunión.
- Extrae **acciones pendientes** con responsable y fecha tentativa.
- Genera **preguntas de seguimiento** para la próxima reunión.

Podés editar cualquier acción o pregunta antes de guardar.

---

## 4. Acciones pendientes

Cada reunión puede dejar acciones ("hablar con la familia", "preparar informe", "reunirse con el equipo de 5°").

### Ver y gestionar
- Desde la reunión: lista de acciones de esa reunión.
- Desde el Dashboard: todas las acciones abiertas de la escuela.
- Marcar una acción como **completada** cuando ya se hizo.
- Editar responsable, descripción, fecha.

---

## 5. Contactos

Sección `/contacts`: tu agenda de familias, docentes y referentes.

- **Importar** — CSV con nombre, email, teléfono, rol.
- **Crear manualmente** — botón **+ Nuevo contacto**.
- Al crear una reunión, podés referenciar contactos existentes como participantes.

---

## 6. Búsqueda

### 6.1 Búsqueda global
Barra de búsqueda global: busca por título de reunión, contenido, nombres de participantes, acciones, hilos.

### 6.2 Preguntar (búsqueda conversacional con IA)
Tab **Preguntar** en el Dashboard. Escribí una pregunta en lenguaje natural sobre el historial de reuniones (ej: "¿qué compromisos quedaron con la familia García?", "¿qué proyectos usan Canva?") y la IA te responde citando las reuniones relevantes con links directos.

Cómo funciona: cada reunión tiene un "embedding" semántico; la pregunta se compara con esos embeddings y se eligen las más cercanas; Claude responde usando solo ese contexto. Si no hay información suficiente, lo dice honestamente.

---

## 7. Hoy (inbox del día)

Tab **Hoy** en el Dashboard. Es tu punto de entrada diario:
- Muestra las acciones que tenés asignadas (o todas, si cambiás el filtro).
- Destaca las reuniones próximas y las que te faltan procesar con IA.
- Pensado para abrir Align a la mañana y saber por dónde empezar.

---

## 7b. Instalar Align en el celular (PWA)

Align es una **Progressive Web App**: podés instalarla en tu celular y usarla como una app nativa, sin Play Store ni App Store.

**Android (Chrome):**
1. Abrí `align.frameops.net` en Chrome.
2. Menú (⋮) → **Agregar a pantalla de inicio** / **Instalar app**.
3. Confirmá. Queda el ícono de Align en tu home.

**iPhone (Safari):**
1. Abrí `align.frameops.net` en Safari.
2. Botón compartir (▭↑) → **Agregar a pantalla de inicio**.
3. Confirmá.

Al abrir desde el ícono, Align corre a pantalla completa, sin barra del navegador. Los assets quedan cacheados para que cargue rápido incluso con conexión lenta.

---

## 8. Digest semanal por email

Cada lunes a la mañana, recibís un email con el resumen de tu semana en Align:
- Reuniones próximas.
- Reuniones sin procesar con IA.
- Tus acciones pendientes (las 8 más recientes).

Si querés probar un envío ahora, desde la app podés forzarlo con el botón correspondiente.

---

## 9. Panel del grupo (solo Owner)

Si administrás varias escuelas, `/dashboard/group` muestra:
- Cantidad de escuelas, reuniones totales, con IA procesada, sin procesar.
- Filtro por escuela.
- Lista de todas las reuniones del grupo.

---

## 10. Administración (`/admin`)

Solo para owners. Permite:
- Ver y gestionar usuarios.
- Invitar a nuevos usuarios por email.
- Administrar escuelas del grupo.
- Configurar **branding** de la escuela (logo, color principal).

### Invitar usuarios
1. `/admin` → **Invitar usuario**.
2. Email, rol, escuela.
3. La persona recibe un email con un link. Al aceptar, queda en la escuela.

---

## 11. Preguntas frecuentes

**¿Puedo editar una minuta después de generarla con IA?**
Sí. Todo lo que produce la IA es editable.

**¿Qué pasa con los audios que subo?**
Se transcriben y se guardan cifrados. Solo tu escuela tiene acceso.

**¿Puedo exportar las reuniones?**
Desde cada reunión podés copiar el contenido. Exportación masiva está en roadmap.

**Olvidé mi contraseña.**
Align usa magic links por email — no hay contraseña que recordar.

---

¿Necesitás ayuda? Contactanos desde align.frameops.net.
