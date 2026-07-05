# 🌿 Flora Amazónica — Backend API

API REST para el registro, validación y consulta de especies de flora de bosque amazónico. Desarrollada con **NestJS** + **TypeORM** + **PostgreSQL** bajo metodología XP, con soporte para autenticación local y social (Google y Apple) orientada a la app iOS.

---

## Tabla de contenidos

- [Descripción](#descripción)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura de módulos](#arquitectura-de-módulos)
- [Esquema de base de datos](#esquema-de-base-de-datos)
- [Instalación y configuración](#instalación-y-configuración)
- [Variables de entorno](#variables-de-entorno)
- [Referencia de endpoints](#referencia-de-endpoints)
- [Autenticación y roles](#autenticación-y-roles)
- [Login social — iOS](#login-social--ios)
- [Ciclo de vida de una cuenta](#ciclo-de-vida-de-una-cuenta)
- [Reglas de negocio principales](#reglas-de-negocio-principales)
- [Notificaciones por correo](#notificaciones-por-correo)
- [Migración de base de datos](#migración-de-base-de-datos)
- [Colecciones Postman](#colecciones-postman)

---

## Descripción

Flora Amazónica es una plataforma web y móvil que permite:

- **Registradores** documentar especies de flora en campo con datos taxonómicos, morfológicos, dasométricos, coordenadas GPS y cinco fotografías obligatorias.
- **Validadores** revisar los registros enviados y aprobarlos, observarlos o rechazarlos desde un panel web.
- **Consultores** buscar el catálogo público de especies validadas usando filtros morfológicos combinables, ver fichas técnicas completas y mapas de distribución georreferenciada.
- **Administradores** gestionar usuarios, roles, secciones morfológicas, el catálogo base de familias/especies y los valores morfológicos configurables.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | NestJS 10 |
| Lenguaje | TypeScript 5 |
| ORM | TypeORM 0.3 |
| Base de datos | PostgreSQL 15+ |
| Autenticación | JWT + Passport |
| Login social | google-auth-library + apple-signin-auth |
| Hash de contraseñas | bcrypt |
| Almacenamiento de fotos | Cloudinary |
| Correo electrónico | Nodemailer + @nestjs-modules/mailer |
| Plantillas de correo | Handlebars (.hbs) |
| Validación de DTOs | class-validator + class-transformer |
| Gestor de paquetes | pnpm |

---

## Arquitectura de módulos

```
src/
├── main.ts                          # Bootstrap: ValidationPipe global, CORS
├── app.module.ts                    # Raíz: TypeORM async, ConfigModule global
│
├── auth/                            # Autenticación: local + Google + Apple
│   ├── auth.controller.ts           # POST /auth/registro|login|google|apple
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts              # Valida token + UserStatus.ACTIVO
│   ├── jwt-auth.guard.ts
│   └── dto/auth.dto.ts              # RegisterDto, LoginDto, SocialLoginDto
│
├── users/                           # Gestión de usuarios y perfil propio
│   ├── users.controller.ts          # /usuarios, /usuarios/perfil, /usuarios/solicitudes
│   ├── users.service.ts
│   ├── users.module.ts
│   ├── entities/user.entity.ts
│   └── dto/user.dto.ts
│
├── species/                         # Registro de especies (registrador)
│   ├── species.controller.ts        # /especies, /especies/fotos
│   ├── species.service.ts
│   ├── species.module.ts
│   └── entities/
│       ├── species-record.entity.ts
│       ├── species-photo.entity.ts
│       └── species-history.entity.ts  # Auditoría de cambios
│
├── catalog/                         # Catálogo base: familias y especies (CSV)
│   ├── catalog.controller.ts        # /catalogo/importar, /familias, /especies
│   ├── catalog.service.ts
│   ├── catalog.module.ts
│   ├── entities/species-catalog.entity.ts
│   └── dto/catalog.dto.ts
│
├── morphology/                      # Valores morfológicos configurables
│   ├── morphology.controller.ts     # /morfologia
│   ├── morphology.service.ts
│   ├── morphology.module.ts
│   ├── entities/morphological-value.entity.ts
│   └── dto/morphology.dto.ts
│
├── sections/                        # Secciones morfológicas por hábito
│   ├── sections.controller.ts       # /secciones
│   ├── sections.service.ts
│   ├── sections.module.ts
│   ├── entities/section.entity.ts
│   └── dto/section.dto.ts
│
├── validation/                      # Flujo de validación científica (validador)
│   ├── validation.controller.ts     # /validacion/pendientes, /validacion/:id/estado
│   ├── validation.service.ts
│   ├── validation.module.ts
│   └── dto/validation.dto.ts
│
├── public-catalog/                  # Catálogo público de consulta
│   ├── public-catalog.controller.ts # /catalogo/buscar, /catalogo/:id, distribución, descarga
│   ├── public-catalog.service.ts
│   ├── public-catalog.module.ts
│   ├── entities/download-quota.entity.ts
│   └── dto/public-catalog.dto.ts
│
├── notifications/                   # Notificaciones por correo (módulo global)
│   ├── notifications.service.ts
│   ├── notifications.module.ts
│   ├── notification.entity.ts
│   └── templates/
│       ├── account-activated.hbs
│       ├── record-received.hbs
│       └── status-changed.hbs
│
├── cloudinary/                      # Servicio de subida de imágenes
│   ├── cloudinary.service.ts
│   └── cloudinary.module.ts
│
└── common/
    ├── enums/
    │   ├── user-role.enum.ts        # administrador | registrador | validador | consultor
    │   ├── user-status.enum.ts      # activo | inactivo | pendiente
    │   ├── record-status.enum.ts    # borrador | en_revision | observado | validado | rechazado
    │   └── photo-type.enum.ts       # hoja | flor | fruto | planta_completa | tallo_corteza
    ├── guards/roles.guard.ts
    ├── roles.decorator.ts
    └── utils/tracking-code.util.ts  # genera FAM-YYYY-NNNNN
```

---

## Esquema de base de datos

```
users
├── id (uuid PK)
├── first_name / paternal_last_name / maternal_last_name
├── email (unique)
├── password_hash (nullable — null para usuarios OAuth)
├── role (enum: administrador | registrador | validador | consultor)
├── status (enum: pendiente | activo | inactivo)
├── confirmed_at (timestamp, nullable)  — null = solicitud nunca aceptada
├── dni / institution / position / avatar_url (nullable)
└── created_at / updated_at

species_catalog
├── id (uuid PK)
├── scientific_name / family
├── is_active (default true)
└── created_at

morphological_values
├── id (uuid PK)
├── habit
├── section (nullable, default '')     — vacío si el campo no tiene sección
├── field_name / option_value
├── selection_type (enum: single | multiple)
├── field_type (enum: option | number) — tipo de input del campo
├── is_required / display_order
├── is_active (default true)
└── created_at

sections
├── id (uuid PK)
├── habit
├── name
├── display_order (default 0)
└── created_at
(índice único: habit + name)

species_records
├── id (uuid PK)
├── registrar_id (FK → users)
├── validator_id (FK → users, nullable)
├── species_catalog_id (FK → species_catalog, nullable)
├── tracking_code (unique, formato FAM-YYYY-NNNNN)
├── scientific_name / family / habit
├── country_distribution (text[])
├── height / crown_diameter / cap / dap (floats, nullable)
├── latitude / longitude (unique combinados)
├── morphological_data (jsonb)
├── status (enum, default borrador)
├── observation_notes (nullable)
├── is_draft (default true)
├── submitted_at / validated_at (nullable)
├── description / growth_stage / bark_texture (nullable)
├── uses / conservation_status / health_status (nullable)
└── created_at / updated_at

species_photos
├── id (uuid PK)
├── species_record_id (FK → species_records)
├── photo_type (enum)
├── cloudinary_url / cloudinary_public_id
├── author_id (FK → users)
└── created_at

species_history
├── id (uuid PK)
├── species_record_id
├── user_id (FK → users, nullable)
├── change_description (text, nullable)
├── previous_state / new_state (jsonb, nullable)
├── action (enum: edicion | aprobacion | rechazo)
└── created_at

notifications
├── id (uuid PK)
├── user_id (FK → users)
├── species_record_id (nullable)
├── event_type (account_activated | record_received | status_changed)
├── title / message / type (nullable)
├── is_read (default false)
├── related_entity_type / related_entity_id (nullable)
├── sent (default false) / sent_at
└── created_at

download_quotas
├── id (uuid PK)
├── user_id / date (unique combinados)
├── count (default 0)
└── created_at / updated_at
```

---

## Instalación y configuración

### Requisitos previos

- Node.js v18 o superior
- pnpm (`npm i -g pnpm`)
- PostgreSQL 15+

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/plJs0n/FloraAmazonica-BackendAPI.git
cd FloraAmazonica-BackendAPI

# 2. Instalar dependencias
pnpm install

# 3. Copiar y completar variables de entorno
cp .env.example .env

# 4. Crear la base de datos
psql -U postgres -c "CREATE DATABASE flora_amazonica;"

# 5. Iniciar el servidor (TypeORM crea las tablas automáticamente en dev)
pnpm start:dev
```

El servidor queda disponible en `http://localhost:3000`.

> **Nota:** `synchronize: true` está habilitado en modo `development`. En producción usar migraciones de TypeORM.

### Modo watch (recarga automática)

```bash
pnpm add -D ts-node-dev   # solo la primera vez
pnpm start:watch
```

---

## Variables de entorno

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flora_amazonica
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=cadena_secreta_larga_y_aleatoria
JWT_EXPIRES_IN=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
CLOUDINARY_FOLDER=flora-amazonica

# Nodemailer
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu_correo@gmail.com
MAIL_PASSWORD=tu_app_password
MAIL_FROM=Flora Amazónica <no-reply@floramazonica.com>

# Social Login — iOS
GOOGLE_CLIENT_ID=tu_google_client_id
APPLE_CLIENT_ID=tu.bundle.id.de.la.app
APPLE_TEAM_ID=tu_apple_team_id

# General
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
```

---

## Referencia de endpoints

### Autenticación — públicos (sin JWT)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/auth/registro` | Crear cuenta nueva (`status=pendiente`, `role=consultor`) |
| `POST` | `/auth/login` | Autenticar con email + contraseña. HTTP 403 si cuenta no está activa |
| `POST` | `/auth/google` | Login con `id_token` de Google Sign-In (iOS) |
| `POST` | `/auth/apple` | Login con `id_token` de Sign in with Apple (iOS) |

### Perfil propio — cualquier rol autenticado

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/usuarios/perfil` | Ver perfil del usuario autenticado |
| `PATCH` | `/usuarios/perfil` | Editar nombre, email, dni, institución, cargo, avatar |
| `PATCH` | `/usuarios/perfil/contrasena` | Cambiar contraseña (requiere contraseña actual; no aplica a cuentas OAuth) |

### Usuarios — solo administrador

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/usuarios` | Listar todas las cuentas |
| `GET` | `/usuarios/solicitudes` | Listar cuentas con `confirmed_at = null` (nunca aceptadas) |
| `PATCH` | `/usuarios/:id/activar` | Activar (`is_active: true`) o desactivar (`false`) |
| `PATCH` | `/usuarios/:id/estado` | Establecer status directamente: `activo`, `inactivo` o `pendiente` |
| `PATCH` | `/usuarios/:id/rol` | Cambiar rol del usuario |
| `DELETE` | `/usuarios/:id` | Eliminar solicitud pendiente (solo si `confirmed_at = null`; 409 si ya fue aceptada) |

### Especies — solo registrador

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/especies` | Crear registro (borrador o envío directo) |
| `GET` | `/especies` | Listar registros propios con estado |
| `GET` | `/especies/:id` | Detalle de un registro |
| `PATCH` | `/especies/:id` | Editar registro (solo si está en `en_revision` u `observado`) |
| `DELETE` | `/especies/:id` | Eliminar registro (solo si está en `en_revision` u `observado`) |
| `POST` | `/especies/fotos` | Subir foto a Cloudinary (`multipart/form-data`) |
| `POST` | `/especies/:id/enviar` | Enviar borrador a revisión |

### Catálogo base — administrador y registrador

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/catalogo/importar/preview` | Vista previa CSV sin persistir |
| `POST` | `/catalogo/importar` | Importar CSV (modo `agregar` o `reemplazar`) |
| `GET` | `/catalogo/familias` | Listar familias con búsqueda parcial (`?search=`) |
| `PATCH` | `/catalogo/familias/:id` | Editar familia |
| `PATCH` | `/catalogo/familias/:id/estado` | Activar o desactivar familia |
| `GET` | `/catalogo/especies` | Listar especies con búsqueda parcial (`?search=`) |
| `PATCH` | `/catalogo/especies/:id` | Editar especie |
| `PATCH` | `/catalogo/especies/:id/estado` | Activar o desactivar especie |

### Morfología — administrador y registrador

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/morfologia` | Listar valores por `?habit=` y/o `?section=` |
| `POST` | `/morfologia` | Crear valor morfológico |
| `PATCH` | `/morfologia/:id` | Editar valor morfológico |
| `PATCH` | `/morfologia/:id/estado` | Activar o desactivar (lógico si tiene registros asociados) |

### Secciones — administrador (lectura: registrador también)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/secciones` | Listar secciones (`?habit=árbol`), ordenadas por `display_order` |
| `POST` | `/secciones` | Crear sección. 409 si ya existe el mismo `name` en el mismo `habit` |
| `PATCH` | `/secciones/:id` | Editar nombre y/o display_order |
| `DELETE` | `/secciones/:id` | Eliminar sección. 409 si hay campos morfológicos que la referencian |

### Validación — solo validador

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/validacion/pendientes` | Listar registros fuera de borrador (`?page=&limit=&status=`) |
| `GET` | `/validacion/:id` | Ficha completa del registro para revisión |
| `PATCH` | `/validacion/:id/estado` | Cambiar estado (`en_revision`, `observado`, `validado`, `rechazado`) |

### Catálogo público — todos los roles autenticados

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/catalogo/buscar` | Buscador morfológico con ranking por coincidencias |
| `GET` | `/catalogo/:id` | Ficha técnica completa de una especie validada |
| `GET` | `/catalogo/:id/distribucion` | Puntos georreferenciados de todos los registros validados de la especie |
| `GET` | `/catalogo/:id/fotos/:fotoId/descargar` | Descarga individual con crédito de autoría (límite 20/día) |

#### Parámetros del buscador morfológico

Todos los filtros son opcionales y combinables. El resultado se ordena por número de coincidencias descendente.

```
GET /catalogo/buscar?habit=árbol&flower_type=compuesta&fruit_type=baya&flower_color=blanco&seed_type=alada&exudate_type=látex&page=1&limit=20
```

---

## Autenticación y roles

Todos los endpoints protegidos requieren:

```
Authorization: Bearer <JWT>
```

El payload del token incluye: `sub` (id), `email`, `role` y `status`.

| Rol | Acceso |
|---|---|
| `administrador` | Gestión de usuarios, secciones, catálogo base, morfología, perfil propio |
| `registrador` | Registro de especies, catálogo de consulta, secciones (solo lectura), perfil propio |
| `validador` | Panel de validación, catálogo de consulta, perfil propio |
| `consultor` | Catálogo de consulta, perfil propio |

---

## Login social — iOS

La app iOS envía el `id_token` obtenido del SDK de Google o Apple al backend. El backend lo verifica criptográficamente y autentica al usuario devolviendo el JWT propio de la plataforma.

### Google Sign-In

```http
POST /auth/google
Content-Type: application/json

{ "id_token": "<id_token_de_google>" }
```

### Sign in with Apple

```http
POST /auth/apple
Content-Type: application/json

{ "id_token": "<id_token_de_apple>" }
```

### Comportamiento

- Si el email **no existe** en la BD → se crea la cuenta con `role=consultor` y `status=pendiente`. El usuario recibe 403 hasta que el admin la active.
- Si el email **existe y está activo** → se entrega el JWT directamente.
- Si el email **existe pero está inactivo o pendiente** → HTTP 403 con mensaje descriptivo.
- Los usuarios OAuth tienen `password_hash = null` y no pueden usar `PATCH /usuarios/perfil/contrasena`.

---

## Ciclo de vida de una cuenta

```
Registro (local o OAuth)
        │
        ▼
  status: PENDIENTE  ──── confirmed_at = null (es una "solicitud")
  (no puede iniciar sesión)
        │
        │  Admin activa → PATCH /usuarios/:id/activar  { is_active: true }
        │                 o PATCH /usuarios/:id/estado  { status: "activo" }
        ▼
  status: ACTIVO  ──── confirmed_at = <timestamp> (ya no es solicitud)
  (acceso habilitado según su rol)
        │
        │  Admin desactiva
        ▼
  status: INACTIVO  ──── confirmed_at conserva su valor
  (acceso bloqueado, datos conservados, no se puede eliminar)
```

> Una cuenta con `confirmed_at = null` puede eliminarse con `DELETE /usuarios/:id`.
> Una vez que `confirmed_at` tiene fecha, la cuenta solo puede activarse/desactivarse, nunca eliminarse.

---

## Reglas de negocio principales

### Registro de especies

- `DAP = CAP / π` se calcula automáticamente solo cuando `habit = árbol`. Las palmeras aceptan CAP pero no calculan DAP.
- Las **5 fotografías** (`hoja`, `flor`, `fruto`, `planta_completa`, `tallo_corteza`) son obligatorias para enviar. En borradores no se requieren.
- Las coordenadas `(latitude, longitude)` deben ser únicas en toda la BD.
- El código de seguimiento `FAM-YYYY-NNNNN` se genera al enviar; el contador reinicia cada año.
- Solo se pueden editar o eliminar registros en estado `en_revision` u `observado`.

### Validación

- Solo el validador accede al panel de validación.
- `observation_notes` es **obligatorio** para los estados `observado` y `rechazado`.
- Al validar se registran `validated_at` y `validator_id` automáticamente.
- El registro pasa a ser visible en el catálogo público cuando `status = validado`.

### Morfología y secciones

- Cada valor morfológico tiene un `field_type`: `option` (selección de opciones) o `number` (entrada numérica).
- El campo `section` es opcional; puede quedar vacío si el valor no pertenece a ninguna sección.
- Las secciones se gestionan como entidades propias desde `/secciones`. No se puede eliminar una sección si tiene campos morfológicos asociados.
- Unicidad de secciones: no puede haber dos secciones con el mismo `name` dentro del mismo `habit`.

### Descarga de fotos

- Máximo **20 descargas por usuario por día**. Al superarlo, HTTP 429.

### Importación CSV del catálogo

El CSV requiere las columnas `scientific_name` y `family`:

```csv
scientific_name,family
Ceiba pentandra,Malvaceae
Swietenia macrophylla,Meliaceae
```

| Modo | Comportamiento |
|---|---|
| `agregar` | Agrega nuevos, actualiza existentes, conserva los no incluidos |
| `reemplazar` | Agrega nuevos, actualiza existentes, desactiva los no incluidos |

### Contraseña

- Mínimo 8 caracteres, al menos una mayúscula y un número.
- No aplica a usuarios que se registraron exclusivamente con OAuth.

---

## Notificaciones por correo

El módulo de notificaciones es interno (sin endpoints públicos) y se dispara automáticamente:

| Evento | Disparado por | Destinatario |
|---|---|---|
| `account_activated` | `PATCH /usuarios/:id/activar` cuando pasa a activo | El usuario activado |
| `record_received` | `POST /especies` con `is_draft=false` o `POST /especies/:id/enviar` | El registrador |
| `status_changed` | `PATCH /validacion/:id/estado` | El registrador propietario |

El envío es siempre **asíncrono**: un fallo SMTP no interrumpe la operación principal. Cada notificación queda registrada en la tabla `notifications` con `sent` y `sent_at`.

Las notificaciones también incluyen campos `title`, `message`, `type`, `is_read`, `related_entity_type` y `related_entity_id` para soporte de notificaciones push y en-app en la versión iOS.

---

## Migración de base de datos

Si ya tienes datos en producción, ejecuta antes de arrancar con el código nuevo:

```sql
-- 1. Enum UserStatus
CREATE TYPE user_status_enum AS ENUM ('activo', 'inactivo', 'pendiente');
ALTER TABLE users ADD COLUMN status user_status_enum NOT NULL DEFAULT 'pendiente';
UPDATE users SET status = 'activo'   WHERE is_active = true;
UPDATE users SET status = 'inactivo' WHERE is_active = false;
ALTER TABLE users DROP COLUMN is_active;

-- 2. Perfil extendido y confirmed_at
ALTER TABLE users
  ADD COLUMN dni          VARCHAR,
  ADD COLUMN institution  VARCHAR,
  ADD COLUMN position     VARCHAR,
  ADD COLUMN avatar_url   VARCHAR,
  ADD COLUMN confirmed_at TIMESTAMP DEFAULT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Campos descriptivos en species_records
ALTER TABLE species_records
  ADD COLUMN description         TEXT,
  ADD COLUMN growth_stage        VARCHAR,
  ADD COLUMN bark_texture        VARCHAR,
  ADD COLUMN uses                TEXT,
  ADD COLUMN conservation_status VARCHAR,
  ADD COLUMN health_status       VARCHAR;

-- 4. field_type y section nullable en morphological_values
CREATE TYPE field_type_enum AS ENUM ('option', 'number');
ALTER TABLE morphological_values
  ADD COLUMN field_type field_type_enum NOT NULL DEFAULT 'option';
ALTER TABLE morphological_values
  ALTER COLUMN section DROP NOT NULL,
  ALTER COLUMN section SET DEFAULT '';

-- 5. Campos push/in-app en notifications
ALTER TABLE notifications
  ADD COLUMN title               VARCHAR,
  ADD COLUMN message             TEXT,
  ADD COLUMN type                VARCHAR,
  ADD COLUMN is_read             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN related_entity_type VARCHAR,
  ADD COLUMN related_entity_id   VARCHAR;

-- 6. Tabla sections (nueva)
CREATE TABLE sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit         VARCHAR NOT NULL,
  name          VARCHAR NOT NULL,
  display_order INT     NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE (habit, name)
);
```

Las tablas `species_history` y `download_quotas` se crean automáticamente con `synchronize: true` en desarrollo si aún no existen.

---

## Licencia

Este proyecto fue desarrollado como parte de un sistema académico de registro de biodiversidad amazónica — Universidad Nacional de la Amazonía Peruana.