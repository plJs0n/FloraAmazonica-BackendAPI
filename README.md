# 🌿 Flora Amazónica — Backend API

API REST para el registro, validación y consulta de especies de flora de bosque amazónico. Desarrollada con **NestJS** + **TypeORM** + **PostgreSQL** bajo metodología XP en tres sprints iterativos.

---

## Tabla de contenidos

- [Descripción](#descripción)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura de módulos](#arquitectura-de-módulos)
- [Esquema de base de datos](#esquema-de-base-de-datos)
- [Instalación y configuración](#instalación-y-configuración)
- [Variables de entorno](#variables-de-entorno)
- [Referencia de endpoints](#referencia-de-endpoints)
- [Reglas de negocio principales](#reglas-de-negocio-principales)
- [Autenticación y roles](#autenticación-y-roles)
- [Notificaciones por correo](#notificaciones-por-correo)
- [Colecciones Postman](#colecciones-postman)

---

## Descripción

Flora Amazónica es una plataforma web y móvil que permite:

- **Registradores** documentar especies de flora en campo con datos taxonómicos, morfológicos, dasométricos, coordenadas GPS y cinco fotografías obligatorias.
- **Validadores** revisar los registros enviados y aprobarlos, observarlos o rechazarlos.
- **Consultores** buscar el catálogo público de especies validadas usando filtros morfológicos combinables, ver fichas técnicas completas y mapas de distribución georreferenciada.
- **Administradores** gestionar usuarios, roles, el catálogo base de familias/especies (importación CSV) y los valores morfológicos configurables.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | NestJS 10 |
| Lenguaje | TypeScript 5 |
| ORM | TypeORM 0.3 |
| Base de datos | PostgreSQL 15+ |
| Autenticación | JWT + Passport |
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
├── main.ts                        # Bootstrap: ValidationPipe global, CORS
├── app.module.ts                  # Raíz: TypeORM async, ConfigModule global
│
├── auth/                          # JWT strategy, guard, registro y login
│   ├── auth.controller.ts         # POST /auth/registro, POST /auth/login
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   ├── jwt-auth.guard.ts
│   └── dto/auth.dto.ts
│
├── users/                         # Gestión de usuarios y perfil propio
│   ├── users.controller.ts        # /usuarios, /usuarios/perfil
│   ├── users.service.ts
│   ├── users.module.ts
│   ├── entities/user.entity.ts
│   └── dto/user.dto.ts
│
├── species/                       # Registro de especies (registrador)
│   ├── species.controller.ts      # /especies, /especies/fotos
│   ├── species.service.ts
│   ├── species.module.ts
│   ├── entities/
│   │   ├── species-record.entity.ts
│   │   └── species-photo.entity.ts
│   └── dto/species.dto.ts
│
├── catalog/                       # Catálogo base: familias y especies (CSV)
│   ├── catalog.controller.ts      # /catalogo/importar, /catalogo/familias, /catalogo/especies
│   ├── catalog.service.ts
│   ├── catalog.module.ts
│   ├── entities/species-catalog.entity.ts
│   └── dto/catalog.dto.ts
│
├── morphology/                    # Valores morfológicos configurables
│   ├── morphology.controller.ts   # /morfologia
│   ├── morphology.service.ts
│   ├── morphology.module.ts
│   ├── entities/morphological-value.entity.ts
│   └── dto/morphology.dto.ts
│
├── validation/                    # Flujo de validación (validador)
│   ├── validation.controller.ts   # /validacion/pendientes, /validacion/:id/estado
│   ├── validation.service.ts
│   ├── validation.module.ts
│   └── dto/validation.dto.ts
│
├── public-catalog/                # Catálogo público de consulta
│   ├── public-catalog.controller.ts  # /catalogo/buscar, /catalogo/:id, distribución, descarga
│   ├── public-catalog.service.ts
│   ├── public-catalog.module.ts
│   ├── entities/download-quota.entity.ts
│   └── dto/public-catalog.dto.ts
│
├── notifications/                 # Notificaciones por correo (módulo global)
│   ├── notifications.service.ts
│   ├── notifications.module.ts
│   ├── notification.entity.ts
│   └── templates/
│       ├── account-activated.hbs
│       ├── record-received.hbs
│       └── status-changed.hbs
│
├── cloudinary/                    # Servicio de subida de imágenes
│   ├── cloudinary.service.ts
│   └── cloudinary.module.ts
│
└── common/
    ├── enums/
    │   ├── user-role.enum.ts        # administrador | registrador | validador | consultor
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
├── first_name
├── paternal_last_name
├── maternal_last_name
├── email (unique)
├── password_hash
├── role (enum)
├── is_active (default false)
└── created_at / updated_at

species_catalog
├── id (uuid PK)
├── scientific_name
├── family
├── is_active (default true)
└── created_at

morphological_values
├── id (uuid PK)
├── habit / section / field_name / option_value
├── selection_type (single | multiple)
├── is_required / display_order
├── is_active (default true)
└── created_at

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
└── created_at / updated_at

species_photos
├── id (uuid PK)
├── species_record_id (FK → species_records)
├── photo_type (enum)
├── cloudinary_url / cloudinary_public_id
├── author_id (FK → users)
└── created_at

notifications
├── id (uuid PK)
├── user_id (FK → users)
├── species_record_id (FK → species_records, nullable)
├── event_type (account_activated | record_received | status_changed)
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
git clone https://github.com/tu-usuario/flora-amazonica-backend.git
cd flora-amazonica-backend

# 2. Instalar dependencias
pnpm install

# 3. Copiar y completar variables de entorno
cp .env.example .env

# 4. Crear la base de datos
psql -U postgres -c "CREATE DATABASE flora_amazonica;"

# 5. Iniciar el servidor (TypeORM crea las tablas automáticamente)
pnpm start:dev
```

El servidor queda disponible en `http://localhost:3000`.

> **Nota:** `synchronize: true` está habilitado en modo `development`. TypeORM sincroniza el esquema automáticamente al arrancar. En producción debe usarse migraciones.

---

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

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

# Cloudinary (necesario para subir fotos)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
CLOUDINARY_FOLDER=flora-amazonica

# Nodemailer (necesario para notificaciones por correo)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu_correo@gmail.com
MAIL_PASSWORD=tu_app_password
MAIL_FROM=Flora Amazónica <no-reply@floramazonica.com>

# General
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4200
```

---

## Referencia de endpoints

### Autenticación — públicos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/auth/registro` | Crear cuenta nueva (`is_active=false`, `role=consultor`) |
| `POST` | `/auth/login` | Autenticar y obtener JWT. HTTP 403 si la cuenta está inactiva |

### Perfil propio — cualquier rol autenticado

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/usuarios/perfil` | Ver perfil del usuario autenticado |
| `PATCH` | `/usuarios/perfil` | Editar nombre y/o email propios |
| `PATCH` | `/usuarios/perfil/contrasena` | Cambiar contraseña (requiere contraseña actual) |

### Usuarios — solo administrador

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/usuarios` | Listar todas las cuentas con estado y rol |
| `PATCH` | `/usuarios/:id/activar` | Activar o desactivar cuenta |
| `PATCH` | `/usuarios/:id/rol` | Cambiar rol del usuario |

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
| `GET` | `/catalogo/familias` | Listar familias con búsqueda parcial |
| `PATCH` | `/catalogo/familias/:id` | Editar familia |
| `PATCH` | `/catalogo/familias/:id/estado` | Activar o desactivar familia |
| `GET` | `/catalogo/especies` | Listar especies con búsqueda parcial |
| `PATCH` | `/catalogo/especies/:id` | Editar especie |
| `PATCH` | `/catalogo/especies/:id/estado` | Activar o desactivar especie |

### Morfología — administrador y registrador

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/morfologia` | Listar valores por `?habit=` y/o `?section=` |
| `POST` | `/morfologia` | Crear valor morfológico |
| `PATCH` | `/morfologia/:id` | Editar valor morfológico |
| `PATCH` | `/morfologia/:id/estado` | Activar o desactivar (lógico si tiene registros asociados) |

### Validación — solo validador

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/validacion/pendientes` | Listar registros fuera de borrador con paginación (`?page=&limit=&status=`) |
| `GET` | `/validacion/:id` | Ficha completa del registro para revisión |
| `PATCH` | `/validacion/:id/estado` | Cambiar estado (`en_revision`, `observado`, `validado`, `rechazado`) |

### Catálogo público — todos los roles autenticados

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/catalogo/buscar` | Buscador morfológico con ranking por coincidencias |
| `GET` | `/catalogo/:id` | Ficha técnica completa de una especie validada |
| `GET` | `/catalogo/:id/distribucion` | Mapa de distribución: puntos georreferenciados de la especie |
| `GET` | `/catalogo/:id/fotos/:fotoId/descargar` | Descarga individual (límite 20 por usuario por día) |

#### Parámetros del buscador morfológico

Todos los filtros son opcionales y combinables. El resultado se ordena por número de coincidencias descendente.

```
GET /catalogo/buscar?habit=árbol&flower_type=compuesta&fruit_type=baya&flower_color=blanco&seed_type=alada&exudate_type=látex&page=1&limit=20
```

---

## Reglas de negocio principales

### Registro de especies

- `DAP = CAP / π` se calcula automáticamente solo cuando `habit = árbol`. Para palmeras, se guarda el CAP pero no se calcula el DAP.
- Las **5 fotografías** (`hoja`, `flor`, `fruto`, `planta_completa`, `tallo_corteza`) son obligatorias para enviar un registro. En borradores no se requieren.
- Las coordenadas `(latitude, longitude)` deben ser únicas en toda la base de datos.
- El código de seguimiento se genera al enviar con el formato `FAM-YYYY-NNNNN` (contador reinicia cada año).
- Solo se pueden editar o eliminar registros en estado `en_revision` u `observado`.

### Validación

- Solo el validador accede al panel de validación.
- El campo `observation_notes` es **obligatorio** cuando el nuevo estado es `observado` o `rechazado`.
- Al validar, se registran automáticamente `validated_at` y `validator_id`.

### Descarga de fotos

- Máximo **20 descargas por usuario por día**. Al superarlo, la API responde con HTTP 429.

### Importación CSV

El CSV debe tener las columnas `scientific_name` y `family`. Se soportan dos modos:

| Modo | Comportamiento |
|---|---|
| `agregar` | Incorpora nuevos, actualiza existentes, mantiene activos los no incluidos |
| `reemplazar` | Incorpora nuevos, actualiza existentes, **desactiva** los no incluidos |

La detección de duplicados se hace por texto normalizado (lowercase + trim). Nunca se eliminan registros físicamente.

---

## Autenticación y roles

Todos los endpoints protegidos requieren el header:

```
Authorization: Bearer <JWT>
```

El payload del token incluye: `sub` (id del usuario), `email`, `role` e `is_active`.

| Rol | Acceso |
|---|---|
| `administrador` | Gestión de usuarios, catálogo base, morfología, perfil propio |
| `registrador` | Registro de especies, catálogo de consulta, perfil propio |
| `validador` | Panel de validación, catálogo de consulta, perfil propio |
| `consultor` | Catálogo de consulta, perfil propio |

Las cuentas nuevas se crean con `role = consultor` e `is_active = false`. Un administrador debe activarlas manualmente.

### Reglas de contraseña

- Mínimo 8 caracteres
- Al menos una letra mayúscula
- Al menos un número

---

## Notificaciones por correo

El módulo de notificaciones es interno (sin endpoints públicos) y se dispara automáticamente en tres eventos:

| Evento | Cuándo se dispara | Destinatario |
|---|---|---|
| `account_activated` | Al activar una cuenta (`is_active: false → true`) | El usuario activado |
| `record_received` | Al enviar un registro (no borrador) | El registrador |
| `status_changed` | Al cambiar el estado de un registro en validación | El registrador propietario |

El envío es siempre **asíncrono**: si el servidor SMTP falla, el sistema registra el error en consola pero no interrumpe la operación principal. Cada notificación queda registrada en la tabla `notifications` con los campos `sent` y `sent_at`.

---

## Licencia

Este proyecto fue desarrollado como parte de un sistema académico de registro de biodiversidad amazónica.