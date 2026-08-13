# Banco Estudiantil

Sistema de gestión de puntos para instituciones educativas. Permite administrar el saldo de los estudiantes, transferir puntos entre compañeros y repartir bonificaciones desde el panel del profesor, todo con soporte para dispositivos móviles y uso sin conexión (PWA).

> **Estado:** proyecto activo, en uso dentro de un aula. Se distribuye como referencia y punto de partida para proyectos similares.

---

## Índice

- [Descripción](#descripcion)
- [Características](#caracteristicas)
- [Stack tecnológico](#stack-tecnologico)
- [Requisitos](#requisitos)
- [Instalación](#instalacion)
- [Uso](#uso)
  - [Portal del estudiante](#portal-del-estudiante)
  - [Panel del profesor](#panel-del-profesor)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Modelo de datos](#modelo-de-datos)
- [Consideraciones de seguridad](#consideraciones-de-seguridad)
- [Limitaciones y trabajo pendiente](#limitaciones-y-trabajo-pendiente)
- [Comandos de desarrollo](#comandos-de-desarrollo)
- [Licencia](#licencia)

---

## Descripción

Banco Estudiantil modela un sistema de recompensas interno de un aula: los estudiantes acumulan puntos (su *saldo*), pueden transferirlos entre sí y el profesor gestiona el saldo de todos desde un panel administrativo.

El sistema se compone de dos interfaces:

- **Portal del estudiante** (`/`): consulta de saldo y transferencias entre compañeros.
- **Panel del profesor** (`/profesor`): administración completa de estudiantes y puntos.

Está pensado para funcionar en dispositivos móviles, con escaneo de códigos QR en vivo y como aplicación instalable.

## Características

### Portal del estudiante

- **Inicio de sesión con cédula.** No requiere contraseña; cada estudiante accede introduciendo su número de cédula.
- **Tarjeta virtual.** Muestra el saldo actual, la cédula y un código QR propio que puede usarse para identificar al estudiante.
- **Transferencias entre estudiantes.** Envío de puntos a otro compañero con descripción obligatoria.
  - Verificación de saldo y de destino.
  - Comprobante de la operación con botón de *compartir* (API nativa del dispositivo o copia al portapapeles).
- **Historial de transacciones.** Listado ordenado por fecha con diferenciación visual por tipo:
  - Débito (transferencia enviada): fila en rojo.
  - Crédito (transferencia recibida): fila en verde.
  - Operaciones del profesor (débito/crédito): fila neutra.

### Panel del profesor

- **Autenticación por contraseña.** Configurada mediante variable de entorno.
- **Débito de puntos.** El monto se descuenta del saldo del estudiante.
- **Crédito de puntos.** Permite repartir bonificaciones (por ejemplo, repartos semanales) con descripción opcional. Accesible directamente desde cada fila de la tabla.
- **Escaneo QR en vivo.** La cámara permanece activa durante toda la sesión; permite escanear múltiples códigos sin recargar la página.
- **Registro individual de estudiantes.**
- **Importación masiva** desde archivos `.xlsx`, `.xls` o `.csv`, con reporte de filas agregadas, duplicadas e inválidas.
- **Búsqueda en tiempo real** por cédula, nombre o apellido.
- **Edición y eliminación** de estudiantes, con diálogos de confirmación.
- **Tablas responsive.** En pantallas pequeñas, las filas se reordenan como tarjetas con etiquetas por campo.

### Aplicación web progresiva (PWA)

- Instalable desde el navegador (manifest + service worker).
- Shell de aplicación precachada y navegación con respaldo offline.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend / Backend | [SvelteKit](https://kit.svelte.dev/) 2 · [Svelte](https://svelte.dev/) 5 (runes) · Vite |
| Base de datos | SQLite (archivo local o [Turso](https://turso.tech/)) vía `@libsql/client` |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Estilos | [oat](https://github.com/knadh/oat) |
| Escaneo QR | [html5-qrcode](https://github.com/mebjas/html5-qrcode) |
| Importación | [xlsx](https://sheetjs.com/) |

## Requisitos

- Node.js 20.19+ o 22.12+ (requisito de Vite 8).
- `npm` o `bun` para gestión de dependencias.
- Conexión a Internet para cargar las imágenes de los códigos QR (generadas por un servicio externo; ver [Limitaciones](#limitaciones-y-trabajo-pendiente)).

## Instalación

### 1. Dependencias

```sh
npm install
```

### 2. Variables de entorno

```sh
cp .env.example .env
```

Edita `.env`:

```dotenv
# Base de datos. Para desarrollo local:
DATABASE_URL="file:local.db"

# Requerido por el cliente libsql. En local puede ser cualquier valor no vacío.
DATABASE_AUTH_TOKEN=""

# Contraseña de acceso al panel del profesor (/profesor)
TEACHER_PASSWORD="tu-contrasena"
```

> Nota: el módulo de base de datos valida que `DATABASE_AUTH_TOKEN` no esté vacío, incluso con una base de datos local de tipo `file:`. Deja un valor de relleno en desarrollo.

### 3. Crear el esquema de base de datos

```sh
npm run db:push
```

### 4. Ejecutar en desarrollo

```sh
npm run dev
```

Abre `http://localhost:5173`.

### 5. Compilación de producción

```sh
npm run build
npm run preview
```

## Uso

### Portal del estudiante

1. Introduce la cédula para iniciar sesión.
2. Revisa el saldo en la tarjeta virtual.
3. Para transferir: indica la cédula del destino, el monto y una descripción.
4. El comprobante generado puede compartirse desde el propio diálogo.

### Panel del profesor

1. Accede a `/profesor` e introduce la contraseña configurada en `TEACHER_PASSWORD`.
2. **Debitar puntos**: escanea el QR del estudiante (la cámara se mantiene activa) o pega la cédula, indica el monto y confirma.
3. **Añadir puntos**: usa el botón de la fila del estudiante en la tabla y especifica monto y descripción.
4. **Registrar / Importar**: alta individual o masiva desde archivos `.xlsx`/`.csv`.
5. **Buscar, editar o eliminar** estudiantes desde la tabla, que en móviles se muestra como tarjetas.

## Estructura del proyecto

```
.
├── src/
│   ├── lib/
│   │   └── server/db/           # Cliente de BD y esquema (Drizzle)
│   └── routes/
│       ├── +layout.svelte       # Layout global, metadatos PWA
│       ├── +page.svelte         # Portal del estudiante
│       ├── +page.server.js      # Acciones: login, transfer, logout
│       └── profesor/
│           ├── +page.svelte     # Panel del profesor
│           ├── +page.server.js  # Acciones: login, debit, credito,
│           │                    #   registrar, importar, editar, eliminar
│           └── QrScanner.svelte # Escáner QR de cámara en vivo
├── static/
│   ├── sw.js                    # Service worker
│   ├── manifest.webmanifest     # Manifest PWA
│   ├── icon-192.png / icon-512.png
│   └── robots.txt
├── drizzle.config.js
└── package.json
```

## Modelo de datos

### `estudiantes`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `cedula` | integer | Clave primaria. Número de identidad. |
| `nombres` | text | Nombre(s) del estudiante. |
| `apellidos` | text | Apellidos del estudiante. |
| `saldo` | real | Saldo disponible en puntos. |
| `qr_code` | text | URL de la imagen del código QR. |

### `transacciones`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | text | Identificador único de la operación. |
| `cedula_origen` | integer | Cédula del origen (FK a `estudiantes`). |
| `cedula_destino` | integer | Cédula del destino (FK a `estudiantes`). |
| `monto` | real | Monto de la operación. |
| `descripcion` | text | Motivo o detalle de la operación. |
| `timestamp` | text | Fecha/hora legible de la operación. |
| `tipo` | text | `debito` o `credito`. |

Las operaciones del profesor se registran con `cedula_origen` = `cedula_destino` (mismo estudiante); el tipo diferencia débito de crédito.

## Consideraciones de seguridad

- **Autenticación del profesor** mediante contraseña en variable de entorno (`TEACHER_PASSWORD`), nunca en el código fuente.
- **Sesiones** de estudiante y profesor mediante cookies `httpOnly` y `sameSite: lax`.
- **Validación en el servidor** de todos los formularios (montos positivos, descripciones con longitud máxima, existencia del estudiante, saldo suficiente).
- **Transferencias atómicas**: el registro de la transacción y la actualización de saldos ocurren dentro de una transacción de base de datos.
- El acceso al panel del profesor está protegido por sesión: todas las acciones verifican la cookie antes de operar.

## Limitaciones y trabajo pendiente

- **Autenticación del estudiante por cédula.** No requiere contraseña; adecuado para un entorno de aula controlado, pero no para un sistema público.
- **Códigos QR externos.** Las imágenes se generan mediante el servicio `api.qrserver.com`, por lo que requieren conexión para mostrarse (el escaneo del QR en sí es solo el número de cédula).
- **Sin multi-institucionalidad.** El modelo asume una única institución/curso por despliegue.
- **Contraseña del profesor en un solo valor global**, sin gestión de múltiples usuarios.
- *Roadmap sugerido:* autenticación por estudiante con PIN, generación local de códigos QR, exportación de historial y auditoría.

## Comandos de desarrollo

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (`http://localhost:5173`). |
| `npm run build` | Compilación de producción. |
| `npm run preview` | Previsualización del build de producción. |
| `npm run db:push` | Aplica el esquema actual a la base de datos. |
| `npm run db:generate` | Genera migraciones de SQL. |
| `npm run db:migrate` | Aplica migraciones pendientes. |
| `npm run db:studio` | Abre el explorador visual de Drizzle Studio. |

## Licencia

Proyecto privado. No se ha definido una licencia pública; consulta con el mantenedor antes de reutilizarlo en otros entornos.
