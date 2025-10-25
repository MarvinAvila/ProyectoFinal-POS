
# 📛 KioskoGo - Backend POS

API REST para el sistema de Punto de Venta (POS). Este servicio está implementado en Node.js con Express y PostgreSQL. Provee endpoints para gestión de usuarios, productos, ventas, inventario, ofertas, alertas y reportes.

Este servicio está implementado en Node.js con Express y PostgreSQL. Provee endpoints para gestión de usuarios, productos, ventas, inventario, ofertas, alertas y reportes. Está pensado para integrarse con la aplicación Flutter en `../frontend_pos`.

## Contenido del README

- Tecnologías Utilizadas
- Estructura del Proyecto
- Configuración e Instalación
- Scripts Disponibles
- Endpoints Principales y Ejemplos
- Seguridad
- Pruebas
- Integraciones Externas
- Patrones y Convenciones del Proyecto
- Guía Detallada de la Arquitectura
  - Configuración (src/config)
  - Controladores (src/controllers)
  - Modelos (src/models)
  - Rutas (src/routes)
  - Middlewares (src/middleware)
  - Validaciones (Múltiples Patrones)
  - Utilidades (src/utils)
  - Servicios (src/services)
- Troubleshooting Rápido
- Contribuciones
- Licencia
- Autores

---

## 📦 Tecnologías Utilizadas

*   **Lenguaje/Runtime**: Node.js (CommonJS)
*   **Framework**: Express.js
*   **Base de Datos**: PostgreSQL (con el cliente `pg`)
*   **Librerías Clave**:
    *   `jsonwebtoken` para autenticación con JWT.
    *   `express-validator` para validación de entradas.
    *   `bcrypt` para hashing de contraseñas.
    *   `dotenv` para gestión de variables de entorno.
    *   `cors`, `helmet` para seguridad.
    *   `multer` para subida de archivos (imágenes de productos).
    *   `cloudinary` para almacenamiento de imágenes en la nube.
    *   `winston` y `morgan` para logging.
*   **Herramientas de Desarrollo**:
    *   `nodemon` para recarga automática en desarrollo.

---

## 📁 Estructura del Proyecto

El código está organizado por responsabilidades para facilitar el mantenimiento y la escalabilidad.

```
/
├── src/
│   ├── config/         # Conexión a BD, Cloudinary, script de inicialización.
│   ├── controllers/    # Lógica de negocio para cada recurso.
│   ├── middleware/     # Middlewares de autenticación, validación y subida de archivos.
│   ├── models/         # Clases que representan las entidades del dominio.
│   ├── routes/         # Definición de rutas de la API.
│   ├── services/       # Lógica de servicios externos (códigos de barras, QR, etc.).
│   ├── utils/          # Helpers, loggers y formato de respuestas.
│   └── validations/    # Reglas de validación (incluyendo patrones legados).
├── .env.example        # Plantilla para variables de entorno.
├── package.json        # Dependencias y scripts.
└── server.js           # Punto de entrada de la aplicación.
```

---

## ⚙️ Configuración e Instalación

### Requisitos Previos

*   Node.js (v18 o superior).
*   PostgreSQL (local o remoto).
*   (Opcional) Cuenta de Cloudinary para la subida de imágenes.

### Pasos de Instalación

1.  **Clonar el repositorio** y navegar a la carpeta del backend.

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno**:
    Crea un archivo `.env` en la raíz de `backend-pos/` usando `.env.example` como plantilla.

    **Ejemplo de archivo `.env`:**
    ```env
    PORT=3000
    
    # Opción 1: URL completa (útil para hosting como Render)
    # DATABASE_URL=postgres://user:password@host:port/dbname
    
    # Opción 2: variables separadas (para desarrollo local)
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=postgres
    DB_PASSWORD=111444
    DB_NAME=punto_venta
    
    # JWT Secret
    JWT_SECRET=tu_clave_secreta_super_segura
    
    # Cloudinary (opcional)
    CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=...
    CLOUDINARY_API_SECRET=...
    ```

## 🚀 Scripts Disponibles

*   **Ejecutar en modo desarrollo** (con recarga automática gracias a `nodemon`):
    ```bash
    npm run dev
    ```

*   **Ejecutar en modo producción**:
    ```bash
    npm start
    ```

Una vez iniciado, el servidor expondrá los siguientes endpoints de utilidad:
- **Health Check**: `GET http://localhost:3000/api/health`
- **DB Info**: `GET http://localhost:3000/api/db-info`
- **Inicializar DB**: `POST http://localhost:3000/api/init-db`

---

## 📡 Endpoints Principales y Ejemplos

La API sigue un patrón RESTful. Aquí algunos de los endpoints más importantes:

| Método | Ruta                      | Descripción                                      |
| :----- | :------------------------ | :----------------------------------------------- |
| `POST` | `/api/auth/login`         | Inicia sesión y devuelve un token JWT.           |
| `GET`  | `/api/productos`          | Lista productos con filtros y paginación.        |
| `POST` | `/api/productos`          | Crea un nuevo producto (soporta subida de imagen). |
| `GET`  | `/api/ventas`             | Lista las ventas realizadas.                     |
| `POST` | `/api/ventas`             | Crea una nueva venta (transaccional).            |
| `GET`  | `/api/reportes/ventas`    | Genera un reporte de ventas por rango de fechas. |
| `GET`  | `/api/dashboard`          | Obtiene métricas clave para el panel de control. |

### Ejemplo: Crear una Venta

**Endpoint**: `POST /api/ventas`

**Payload (body JSON)**:
```json
{
	"id_usuario": 1,
	"forma_pago": "efectivo",
	"detalles": [
		{ "id_producto": 10, "cantidad": 2, "precio_unitario": 15.50 },
		{ "id_producto": 12, "cantidad": 1, "precio_unitario": 45.00 }
	]
}
```
Esta operación es transaccional: actualiza el stock, registra la venta y sus detalles, y genera un historial. Si algo falla, se revierte todo.

---

## 🧪 Pruebas

Actualmente, el proyecto no cuenta con un conjunto de pruebas automatizadas. Se recomienda añadir pruebas unitarias y de integración utilizando frameworks como **Jest** y **Supertest** para garantizar la calidad y estabilidad del código.

---

## 🔐 Seguridad

La seguridad es un pilar fundamental de esta API.

*   **Autenticación**: Las rutas protegidas utilizan **JSON Web Tokens (JWT)**. El token debe ser enviado en el header `Authorization` como `Bearer <token>`.
*   **Autorización**: Se implementa un sistema de roles (`dueño`, `admin`, `gerente`, `cajero`) y permisos granulares para controlar el acceso a los diferentes recursos y acciones. Ver `src/middleware/auth.js`.
*   **Validación de Entradas**: Se utiliza `express-validator` para validar y sanitizar todos los datos de entrada antes de que lleguen a los controladores, previniendo ataques como XSS e inyección de datos maliciosos.
*   **Seguridad de Headers**: Se utilizan middlewares como `cors` y `helmet` para proteger la API contra vulnerabilidades web comunes.
*   **Rate Limiting**: Se ha implementado un limitador de peticiones básico para prevenir ataques de fuerza bruta o denegación de servicio.

---

## 🧩 Integraciones Externas

*   **Cloudinary**: Usado para subir, almacenar y optimizar las imágenes de los productos. La configuración se encuentra en `src/config/cloudinary.js`.
*   **PostgreSQL**: La base de datos principal del sistema. La configuración de conexión está en `src/config/database.js`.

---

## 💡 Patrones y Convenciones del Proyecto

*   **Formato de Respuesta**: Todas las respuestas JSON siguen un formato unificado: `{ success: boolean, message?: string, data?: any }`. Esto es gestionado por el helper `src/utils/responseHelper.js`.
*   **Transacciones**: Las operaciones críticas que afectan a múltiples tablas (ej. crear una venta) utilizan transacciones de PostgreSQL (`BEGIN`, `COMMIT`, `ROLLBACK`) para garantizar la consistencia de los datos.
*   **Logging**: Se utiliza un logger centralizado (`winston`) con diferentes niveles (`api`, `database`, `audit`, `security`) para una observabilidad clara.
*   **Código Idempotente**: El script de inicialización de la base de datos (`src/config/initDatabase.js`) utiliza sentencias `IF NOT EXISTS` para poder ser ejecutado múltiples veces sin causar errores.

---

## 📖 Guía Detallada de la Arquitectura

A continuación se detalla el propósito de cada componente principal del proyecto.

---

## Configuración (src/config)

La carpeta `src/config` contiene la configuración crítica que necesitas revisar antes de ejecutar el backend. Aquí se describen los archivos más importantes y las variables de entorno relacionadas.

- `database.js`
	- Conecta a PostgreSQL usando `pg` y exporta un wrapper `db` con `query(text, params)` y `getClient()` (para transacciones).
	- Soporta dos modos de conexión:
		- `DATABASE_URL` (cadena completa, útil para hosting como Render). Si está presente, activa `ssl: { rejectUnauthorized: false }` automáticamente.
		- Variables separadas `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (útil en desarrollo local).
	- Valores por defecto para desarrollo: `DB_PASSWORD=111444`, `DB_NAME=punto_venta`.
	- Eventos: `pool.on('connect')` loggea conexión, `pool.on('error')` hace exit en errores graves.
	- Depuración SQL: activa `DB_LOG_QUERIES=true` para imprimir todas las consultas ejecutadas.

- `cloudinary.js`
	- Exporta la configuración del SDK de Cloudinary. Requiere las variables `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
	- Se usa en `productoController` y en endpoints de upload. El flujo típico en controladores: transformar `req.file.buffer` a base64, construir `dataURI` y llamar a `cloudinary.uploader.upload(dataURI, { folder: 'punto_venta', quality: 'auto:good', fetch_format: 'auto' })`.

- `initDatabase.js`
	- Contiene `inicializarBaseDeDatos()` — ejecuta un script SQL idempotente que crea tablas principales (`usuarios`, `productos`, `ventas`, `detalle_venta`, `alertas`, `historial_inventario`, `comprobantes`, etc.).
	- Contiene `crearTriggers()` — crea funciones y triggers (por ejemplo descontar stock y generar alertas). Está separado porque algunos hosts bloquean la creación de funciones/triggers.
	- Contiene `actualizarEstructuraProductos()` para cambios incrementales sobre la tabla `productos`.
	- `server.js` llama a `inicializarBaseDeDatos()` al arrancar y expone `POST /api/init-db` para inicializar manualmente si es necesario.

Recomendación de orden antes de ejecutar por primera vez:
1. Definir variables de entorno en `.env` (ver sección Variables de entorno en este README).
2. Ejecutar `npm install`.
3. Levantar el servidor (`npm run dev`) o ejecutar `POST /api/init-db` si la inicialización automática falló.

---

## Controllers (src/controllers)

La carpeta `src/controllers` contiene la lógica de negocio por recurso. Cada archivo sigue un patrón consistente y está diseñado para ser llamado desde `src/routes/*.js`.

Qué encontrarás y por qué importa:

- Responsabilidad: los controllers encapsulan la validación adicional del request, transacciones (cuando aplica), llamadas al `db`, uso de modelos (`src/models/*`) y la construcción de la respuesta usando `src/utils/responseHelper.js`.
- Recursos principales (archivos):
	- `ventaController.js` — operaciones sobre ventas: listado (filtros/paginación), crear venta (transacción que inserta `ventas`, `detalle_venta`, actualiza `productos.stock` y registra `historial_inventario`), eliminar venta (rollback de stock).
	- `detalleVentaController.js` — CRUD sobre `detalle_venta`; usa transacciones para consistencia de stock e historial.
	- `productoController.js` — listado y búsquedas avanzadas, creación (genera código de barras/QR, sube imagen a Cloudinary), actualización y eliminación (desactiva en caso de ventas relacionadas).
	- `usuarioController.js`, `proveedorController.js`, `categoriaController.js` — CRUD estándar con validaciones.
	- `alertaController.js`, `reporteController.js`, `dashboardController.js` — endpoints de consulta, generación de reportes y métricas.
	- `uploadController.js`, `barcodeController.js`, `chatbotController.js` — integraciones y utilidades (subida de archivos, generación de códigos, chatbot).

Patrones y convenciones en controllers:

- Formato de respuesta: usar siempre `responseHelper` para mantener consistencia `{ success, message?, data? }`.
- Logging: usar `logger` (`src/utils/logger.js`) con niveles `api`, `database`, `audit`, `security`.
- Transacciones: cuando la operación afecta varias tablas (ventas, detalles, stock, historial) usar `const client = await db.getClient()` + `BEGIN/COMMIT/ROLLBACK`. Ejemplos claros en `ventaController.create` y `detalleVentaController.create`.
- Validaciones: además de middleware (p. ej. `src/middleware/validation.js`), los controllers validan IDs con `QueryBuilder.validateId()` y retornan errores claros (`400`, `404`, `409`).
- Manejo de errores: atrapar excepciones y devolver usando `responseHelper.error(...)`; incluir detalles en entornos no productivos.
- Archivos que mapean DB ↔ modelo: `src/utils/modelMapper.js` y modelos en `src/models`.

Ejemplos de endpoints (rutas montadas en `server.js`):

- Productos
	- GET `/api/productos` — búsqueda, filtros, paginación (q, categoria, proveedor, por_caducar, con_stock_minimo)
	- GET `/api/productos/:id` — obtener producto enriquecido
	- POST `/api/productos` — crear producto (acepta multipart/form-data para `imagen`; si no se envía `codigo_barra` se genera automáticamente; intenta crear QR y barra)
	- PUT `/api/productos/:id` — actualizar producto
	- DELETE `/api/productos/:id` — elimina o desactiva según dependencias

- Ventas
	- GET `/api/ventas` — listar con filtros por fecha y usuario
	- GET `/api/ventas/:id` — obtener venta completa con detalles y comprobante
	- POST `/api/ventas` — crear venta (payload JSON con `id_usuario`, `detalles`)
	- DELETE `/api/ventas/:id` — eliminar venta (revierte stock y registra historial)

- Detalle de venta
	- GET `/api/detalle-venta` — listar detalles
	- POST `/api/detalle-venta` — agregar detalle a venta existente (valida stock)

Buenas prácticas al añadir o cambiar controllers:

1. Crear el archivo `src/controllers/<recurso>Controller.js` y exportar un objeto con métodos (getAll, getById, create, update, delete, etc.).
2. Colocar validaciones en `src/validations` o en `src/middleware/validation.js` y reutilizarlas en las rutas.
3. Añadir la ruta en `src/routes/<recurso>.js` y montarla en `server.js`.
4. Usar `db.getClient()` y transacciones para operaciones que toquen varias tablas. Hacer `client.release()` en finally.
5. Mantener el uso de `responseHelper` y logs `logger.audit` para acciones que deban auditarse (creación/eliminación de recursos críticos).

Pruebas manuales recomendadas para cambios en controllers:

- Verificar responses con Postman o curl: códigos HTTP y estructura `{ success, message?, data? }`.
- Probar casos de error (ID inválido, stock insuficiente, referencial faltante) y confirmar ROLLBACK en la BD.
- Si el controller usa subida de archivos, probar multipart/form-data y revisar Cloudinary para confirmación de subida.

---

He añadido esta sección para que el README sea una referencia técnica útil antes de editar lógica en `src/controllers`. Dime si quieres que incluya ejemplos de payloads completos (por ejemplo JSON para `POST /api/productos` y `POST /api/ventas`) o que cree un archivo adicional `backend-pos/CONTROLLERS.md` con ejemplos interactivos.

---

## Middleware (src/middleware)

La carpeta `src/middleware` contiene middlewares reusables que se interponen en las rutas para autenticación, validación y manejo de archivos. Revisar estos archivos antes de añadir nuevas rutas o modificar comportamiento de seguridad.

- `auth.js`
	- Implementa protección de rutas mediante JWT. Se espera que `req.user` se inyecte cuando el token es válido. Los controllers usan `req.user?.id_usuario` para auditoría y permisos.
	- Uso típico: `router.get('/ruta-protegida', authMiddleware, controlador.metodo)`.
	- Asegúrate de que las rutas públicas (login/register) no apliquen este middleware.

- `uploadMiddleware.js`
	- Configura `multer` para procesar `multipart/form-data` y exponer `req.file` o `req.files` a los controladores.
	- Se usa en `productoController` y en `uploadController` para recibir imágenes. Los controladores convierten `req.file.buffer` a base64 y suben a Cloudinary.
	- Recomendación: validar el tipo MIME y el tamaño máximo del archivo en la configuración de `multer`.

- `validation.js`, `validation/*` y `src/validations`
	- El proyecto utiliza `express-validator` de forma extensiva, pero la estructura ha evolucionado, resultando en tres patrones distintos que coexisten.
	- **Patrón 1 (Centralizado):** `src/middleware/validation.js` contiene validaciones para entidades clave como `usuario`, `producto` y `venta`, además de un manejador de errores genérico.
	- **Patrón 2 (Modular en Middleware):** La carpeta `src/middleware/validation/` contiene archivos de validación por recurso (ej. `categoria.js`, `proveedor.js`), cada uno con sus propias reglas y manejador de errores.
	- **Patrón 3 (Legado):** La carpeta `src/validations/` contiene `authValidations.js`, un módulo autocontenido para la autenticación.
	- La sección `## Validaciones` más abajo detalla estos patrones.

Buenas prácticas y notas de seguridad:

- Siempre valida entrada en los middleware antes de ejecutar lógica de negocio; evita duplicar validaciones en controllers cuando sea posible. Los controllers deben asumir que las validaciones básicas ya se han ejecutado.
- No confiar únicamente en middleware de cliente: volver a validar en controllers cuando se realicen cálculos críticos (stock, precios, autorizaciones) o cuando se use `req.user` para permisos.
- Para uploads, normalizar el tamaño máximo y extensiones permitidas en `uploadMiddleware.js` y sanitizar nombres de archivo si los guardas en la DB.

Pruebas y depuración:

- Para probar autenticación: generar un token con `POST /api/auth/login` (revisa `authController.js`) y usar `Authorization: Bearer <token>` en solicitudes.
- Para probar uploads: usar Postman con `multipart/form-data` y el campo `imagen` (o el nombre que tus rutas esperan) y verificar que `cloudinary` recibe la imagen.
- Para validar reglas, ejecutar casos de validación fallida y confirmar que la respuesta es `400` con estructura: `{ success: false, message: 'Errores de validación', errors: [...] }`.

---

He documentado `src/middleware` — dime si quieres que agregue ejemplos CURL / Postman para JWT, upload (multipart) y una plantilla de validaciones reutilizable.

---

## Models (src/models)

La carpeta `src/models` contiene clases ligeras que representan las entidades del dominio (Producto, Venta, DetalleVenta, Usuario, etc.). Estas clases encapsulan validaciones, mapeo desde filas de la BD y utilidades de dominio (por ejemplo `calcularTotales`, `estaPorCaducar`, `necesitaReposicion`). Usar estos modelos ayuda a mantener la lógica de negocio fuera de los controladores y a estandarizar transformaciones.

Patrones observados:

- Cada modelo exporta una clase con:
	- Métodos de instancia (p. ej. `calcularSubtotal`, `agregarDetalle`, `necesitaReposicion`).
	- Métodos estáticos `fromDatabaseRow(row)` para construir una instancia a partir de la fila SQL (parsean números y manejan JSON donde aplica).
	- Métodos estáticos `validate(data)` que retornan un array de errores (vacío si es válido). Ejemplo: `Producto.validate(productoData)`.

Modelos principales y puntos importantes:

- `Producto.js`
	- Lógica de inventario: `tieneStockSuficiente(cantidad)`, `necesitaReposicion(stockMinimo)`, `estaPorCaducar(diasAntelacion)`, `getEstadoStock()`, `diasParaCaducar()`.
	- Utilidades de negocio: `calcularGanancia()`, `margenGanancia()`, `esRentable()`.
	- `fromDatabaseRow(row)` parsea campos numéricos y maneja `codigos_public_ids` que puede venir como string JSON o como objeto.
	- `validate(productoData)` devuelve una lista de errores legibles (nombre corto, precios positivos, stock no negativo, unidad permitida).

- `Venta.js`
	- Representa la venta y contiene `detalles` como array de `DetalleVenta`.
	- Métodos: `agregarDetalle(detalle)`, `calcularTotales()` (aplica IVA 16% por convención), `esDelDia()`.
	- `crearNueva(id_usuario, forma_pago)` es una fábrica usada por `ventaController.create`.

- `DetalleVenta.js`
	- Representa una línea de venta con `cantidad`, `precio_unitario` y `subtotal`.
	- Métodos: `calcularSubtotal()`, `crearNuevo(...)` para construir una instancia con subtotal calculado.

- Otros modelos: `Usuario.js`, `Proveedor.js`, `Categoria.js`, `Alerta.js`, `HistorialInventario.js`, `Comprobante.js`, `Oferta.js`, `ProductoOferta.js`, `Reporte.js` — cada uno contiene reglas y helpers específicos; revisa el archivo correspondiente si cambias lógica de dominio.

Cómo usar los modelos en controllers:

1. Obtener filas desde la BD con `db.query(...)`.
2. Convertir filas a modelo con `Model.fromDatabaseRow(row)` o usando `src/utils/modelMapper.js` (ya provee mappers reutilizables).
3. Usar métodos del modelo para reglas de negocio (p. ej. `producto.necesitaReposicion()` o `venta.calcularTotales()`).
4. Antes de insertar/actualizar, validar con `Model.validate(data)` y, si hay errores, devolver `responseHelper.validationError` o `responseHelper.error` con código `400`.

Buenas prácticas para nuevos modelos:

- Mantener el mapeo DB → objeto en `fromDatabaseRow` y dejar la serialización (por ejemplo a JSON) en `modelMapper` o en los controladores si se necesita enriquecer la salida.
- Validaciones: colocar reglas en `static validate()` que retornen array de strings; esto facilita reutilizarlas en routes y controllers.
- Evitar lógica de I/O (queries o llamadas a servicios externos) dentro de modelos — los modelos deben ser determinísticos y puros en cuanto a lógica de negocio.

---

He documentado la carpeta `src/models`. ¿Quieres que añada ejemplos concretos de uso (snippets en `backend-pos/CONTROLLERS.md`) que muestren: convertir filas a modelos, validar antes de insertar, y usar métodos como `venta.calcularTotales()`? Puedo generarlos en la siguiente iteración.

---

## Requisitos locales

- Node.js 18+ (se recomienda la versión LTS actual).
- PostgreSQL (local o remoto). Por conveniencia el `src/config/database.js` incluye credenciales por defecto para desarrollo; cámbialas en `.env`.
- (Opcional) Cuenta/credenciales de Cloudinary si usas subida de imágenes.

---

## Ejecutar en desarrollo

1. Instalar dependencias dentro de la carpeta `backend-pos`:

```pwsh
cd backend-pos
npm install
```

2. Crear un archivo `.env` en `backend-pos/` con las variables necesarias (ejemplo abajo).

3. Levantar el servidor en modo desarrollo (usa `nodemon`):

```pwsh
npm run dev
```

4. Endpoints útiles que estarán disponibles:

- Health: GET http://localhost:3000/api/health
- DB info: GET http://localhost:3000/api/db-info
- Inicializar DB manual: POST http://localhost:3000/api/init-db

El servidor intenta ejecutar la inicialización de tablas automáticamente al arrancar; si falla, usa `POST /api/init-db`.

---

## Variables de entorno (ejemplo `.env`)

```env
PORT=3000
# Opción 1: URL completa (útil para hosting como Render)
DATABASE_URL=postgres://user:password@host:port/dbname

# Opción 2: variables separadas (si no usas DATABASE_URL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=111444
DB_NAME=punto_venta

# Si quieres ver las queries SQL en consola
DB_LOG_QUERIES=false

# Cloudinary (opcional, usado por endpoints de upload/productos)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Entorno
NODE_ENV=development
```

Nota: el archivo `src/config/database.js` usa `DATABASE_URL` si está presente y activa SSL con `rejectUnauthorized:false` (útil para hosts que requieren SSL). Para desarrollo local, usa las variables `DB_*`.

---

## Inicialización y migraciones ligeras

- `POST /api/init-db` ejecuta el script definido en `src/config/initDatabase.js` que crea tablas y columnas (idempotente con `IF NOT EXISTS`).
- `src/config/initDatabase.js` también exporta `crearTriggers()` que crea triggers y funciones PL/pgSQL (se ejecuta por separado porque puede fallar en algunos entornos).
- Hay endpoints administrativos para aplicar cambios estructurales (ej.: `/api/admin/update-barcode-fields`, `/api/admin/update-alertas-table`) definidos en `server.js` — úsalos con cuidado.

Recomendación: en producción usa un sistema de migraciones (Flyway, Sqitch o node-pg-migrate). El script actual está bien para entornos pequeños o desarrollo local.

---

## Routes (src/routes)

La carpeta `src/routes` define las rutas públicas del servidor. Cada archivo exporta un `express.Router()` y mapea rutas HTTP a métodos de los controllers. Las rutas se montan en `server.js` bajo el prefijo `/api`.

Convenciones y patrón:

- Nombre de archivo -> ruta base: `productos.js` → `/api/productos`, `ventas.js` → `/api/ventas`, etc.
- Cada archivo de rutas normalmente sigue este patrón:
	1. Importar `express`, el controller correspondiente, las validaciones y middlewares (auth, upload, validation).
	2. Definir rutas: `router.get('/', controller.getAll)`, `router.post('/', validations.create, validationMiddleware, controller.create)`, `router.get('/:id', controller.getById)`, `router.put('/:id', controller.update)`, `router.delete('/:id', controller.delete)`.
	3. Exportar el router: `module.exports = router`.

Lista rápida de archivos en `src/routes` (mapa):

- `alertas.js` → `/api/alertas`
- `auth.js` → `/api/auth` (login, register)
- `barcodes.js` → `/api/barcodes` (generación/descarga de códigos)
- `categorias.js` → `/api/categorias`
- `chatbot.js` → `/api/chatbot`
- `comprobantes.js` → `/api/comprobantes`
- `dashboard.js` → `/api/dashboard`
- `detalleVenta.js` → `/api/detalle-venta`
- `inventario.js` → `/api/inventario`
- `ofertas.js` → `/api/ofertas`
- `productoOferta.js` → `/api/producto-oferta`
- `productos.js` → `/api/productos`
- `proveedores.js` → `/api/proveedores`
- `reportes.js` → `/api/reportes`
- `uploads.js` → `/api/uploads`
- `usuarios.js` → `/api/usuarios`
- `ventas.js` → `/api/ventas`

Ejemplo práctico (esqueleto de `productos.js`):

```javascript
const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const validations = require('../middleware/validation/producto');
const validationMiddleware = require('../middleware/validation');
const upload = require('../middleware/uploadMiddleware');

router.get('/', productoController.getAll);
router.get('/:id', productoController.getById);
router.post('/', upload.single('imagen'), validations.create, validationMiddleware, productoController.create);
router.put('/:id', upload.single('imagen'), validations.update, validationMiddleware, productoController.update);
router.delete('/:id', productoController.delete);

module.exports = router;
```

Cómo montar nuevas rutas en `server.js`:

1. Crear `src/routes/<recurso>.js` que exporte el router.
2. En `server.js`, importar la ruta: `const recursoRoutes = require('./src/routes/<recurso>');`
3. Montarla: `app.use('/api/<recurso>', recursoRoutes);`

Notas prácticas:

- Orden de middlewares: coloca primero middlewares de archivo (upload), luego validaciones, y finalmente `auth` si la ruta requiere autenticación.
- Mantén las rutas RESTful y el manejo de errores consistente con `responseHelper` desde los controladores.
- Para endpoints que requieren transacciones (ventas/detalle), la lógica transaccional está en los controllers; las rutas deben ser lo más delgadas posible.

Testing y debug de rutas:

- Usa Postman o curl para comprobar: `curl -X GET http://localhost:3000/api/productos`.
- Para rutas protegidas, obtener token con `POST /api/auth/login` y añadir cabecera `Authorization: Bearer <token>`.
- Si una ruta recibe archivos y no ves `req.file`, revisa que `uploadMiddleware` esté aplicado y que el request sea `multipart/form-data`.

---

## Utils (src/utils)

La carpeta `src/utils` contiene utilidades y helpers reutilizables que dan soporte a controllers, models y servicios. Estas utilidades encapsulan funcionalidad común y patrones frecuentes.

Archivos principales y su propósito:

- `responseHelper.js`
  - Estandariza respuestas JSON con estructura `{ success, message?, data? }`.
  - Métodos: `success(res, data?, message?)`, `error(res, message, code)`, `validationError(res, errors)`, `notFound(res, resource)`, `forbidden(res)`, `unauthorized(res)`.
  - Los controllers deben usar estos métodos para mantener consistencia.

- `logger.js`
  - Sistema de logging centralizado con niveles: `api`, `database`, `audit`, `security`.
  - En producción omite stack traces y detalles sensibles.
  - Ejemplos: `logger.api('Endpoint llamado', metadata)`, `logger.audit('Recurso modificado', usuario_id, accion, detalles)`.

- `modelMapper.js`
  - Convierte filas de BD a instancias de modelos.
  - Métodos como `toProducto(row)`, `toVenta(row)`, `toDetalleVenta(row)`.
  - Usa los métodos `fromDatabaseRow` de cada modelo.

- `queryBuilder.js`
  - Helpers para construir queries SQL dinámicas.
  - `validateId(id)`: valida y sanitiza IDs numéricos.
  - `sanitizeSearchTerm(term)`: limpia términos de búsqueda.
  - Usado en controllers para filtros y búsquedas.

- `helpers.js`
  - Funciones de utilidad general.
  - Manejo de paginación, fechas, strings.
  - `getPaginationParams`, `sanitizeInput`, etc.

- `barcodeGenerator.js`
  - Generación de códigos de barras y QR.
  - Usado por `barcodeService` y `qrService`.

Ejemplo de uso en controllers:

```javascript
// Ejemplo de uso combinado de utils
const logger = require('../utils/logger');
const responseHelper = require('../utils/responseHelper');
const QueryBuilder = require('../utils/queryBuilder');
const ModelMapper = require('../utils/modelMapper');

async function getById(req, res) {
  try {
    const id = QueryBuilder.validateId(req.params.id);
    const result = await db.query('SELECT * FROM productos WHERE id_producto = $1', [id]);
    
    if (result.rows.length === 0) {
      return responseHelper.notFound(res, 'Producto');
    }
    
    const producto = ModelMapper.toProducto(result.rows[0]);
    logger.api('Producto recuperado', { id, usuario: req.user?.id_usuario });
    
    return responseHelper.success(res, producto);
  } catch (error) {
    logger.error('Error en getById', error);
    return responseHelper.error(res, 'Error al obtener producto', 500);
  }
}
```

---

## Services (src/services)

La carpeta `src/services` contiene servicios que encapsulan lógica de negocio compleja o integraciones con sistemas externos. Cada servicio tiene una responsabilidad específica y puede ser usado por múltiples controllers.

Servicios disponibles:

- `barcodeService.js`
  - Genera y gestiona códigos de barras para productos.
  - Usa `barcodeGenerator.js` internamente.
  - Métodos: `generateBarcode(text)`, `generateAndUpload(producto)`.
  - Integrado con Cloudinary para almacenamiento de imágenes.

- `qrService.js`
  - Similar a `barcodeService` pero para códigos QR.
  - Útil para links rápidos a detalles de producto.
  - Métodos: `generateQR(text)`, `generateProductQR(producto)`.

- `chatbotService.js`
  - Implementa lógica de chatbot para consultas.
  - Procesa preguntas sobre productos, stock, precios.
  - Integrable con servicios externos de NLP/AI.

- `labelService.js`
  - Generación de etiquetas y PDF para productos.
  - Combina información de producto, códigos y precios.

Ejemplo de uso en controllers:

```javascript
const BarcodeService = require('../services/barcodeService');
const QRService = require('../services/qrService');

// En productoController.create
const codigosGenerados = await Promise.all([
  BarcodeService.generateAndUpload(productoData),
  QRService.generateProductQR(productoData)
]);

productoData.codigo_barras_url = codigosGenerados[0]?.url;
productoData.codigo_qr_url = codigosGenerados[1]?.url;
```

Notas de implementación:

1. Los servicios deben ser stateless y recibir toda la información necesaria vía parámetros.
2. Usar async/await para operaciones asíncronas (ej: subida a Cloudinary).
3. Manejar errores apropiadamente y documentar casos de error esperados.
4. Si un servicio falla, los controllers deben poder continuar (ejemplo: crear producto sin códigos).

Testing de servicios:

- Probar generación de códigos: `BarcodeService.generateBarcode('TEST-123')`.
- Verificar integración Cloudinary: revisar URLs y public_ids generados.
- Para chatbot: probar diferentes tipos de consultas y respuestas esperadas.

---

## Validaciones (Múltiples Patrones)

El sistema de validación de entradas utiliza `express-validator` y se ha organizado de diferentes maneras a lo largo del desarrollo del proyecto. Es importante entender los tres patrones existentes para mantener la consistencia al modificar o añadir endpoints.

### Patrón 1: Centralizado en `src/middleware/validation.js`

Este archivo actúa como un centro para validaciones comunes y para las entidades más antiguas o centrales del sistema.

- **Contenido:**
    - **Validaciones genéricas:** `validateId()`, `validatePagination()`, `validateSearch()`.
    - **Reglas específicas:** Contiene las reglas para `usuario`, `producto` y `venta` directamente dentro del objeto exportado.
    - **Manejador de errores:** Un único `handleValidationErrors` que usa `responseHelper` para formatear la respuesta.
- **Uso en rutas:**
    ```javascript
    const validation = require('../middleware/validation');
    
    router.post('/', 
        validation.producto.create, // Se accede a las reglas anidadas
        validation.handleValidationErrors, 
        productoController.create
    );
    ```
- **Cuándo usarlo:** Este patrón ya no se recomienda para nuevas entidades. Se mantiene por retrocompatibilidad.

### Patrón 2: Modular en `src/middleware/validation/*`

Este es el patrón preferido para las entidades más nuevas. Cada recurso tiene su propio archivo de validación, lo que mejora la organización.

- **Estructura:**
    - `src/middleware/validation/categoria.js`
    - `src/middleware/validation/proveedor.js`
    - `src/middleware/validation/oferta.js`
    - etc.
- **Contenido de cada archivo:** Exporta un objeto que contiene los arrays de reglas y su propio `handleValidationErrors`.
- **Uso en rutas:**
    ```javascript
    const categoriaValidations = require('../middleware/validation/categoria');
    
    router.post('/', 
        categoriaValidations.create, 
        categoriaValidations.handleValidationErrors, 
        categoriaController.create
    );
    ```
- **Cuándo usarlo:** Al crear un **nuevo recurso** o al refactorizar uno existente.

### Patrón 3: Legado en `src/validations/authValidations.js`

Este fue uno de los primeros patrones y es específico para la autenticación.

- **Estructura:** Un único archivo `authValidations.js` en una carpeta `src/validations` separada.
- **Contenido:** Similar al Patrón 2, exporta un objeto con las reglas para `login`, `register`, etc., y su propio `handleValidationErrors`.
- **Uso en rutas (`src/routes/auth.js`):**
    ```javascript
    const authValidations = require('../validations/authValidations');
    
    router.post('/login', 
        authValidations.login, 
        authValidations.handleValidationErrors, 
        authController.login
    );
    ```
- **Cuándo usarlo:** Este patrón se considera obsoleto. Si se modifica extensivamente la autenticación, se debería migrar al Patrón 2 (`src/middleware/validation/auth.js`).

### Recomendación General

Al trabajar con el código:
1.  **Identifica** qué patrón de validación está usando la ruta que vas a modificar.
2.  **Mantén la consistencia** dentro de ese mismo archivo de rutas.
3.  Para **nuevas entidades**, utiliza siempre el **Patrón 2** (archivos modulares en `src/middleware/validation/`).

Esta diversidad de patrones es una forma de "deuda técnica" que se puede unificar en el futuro para simplificar el proyecto.

---

---

## Troubleshooting rápido

- Error de conexión a BD al iniciar: revisa `.env` y ejecuta `curl http://localhost:3000/api/health` para ver el mensaje detallado.
- Permisos al crear triggers: algunos proveedores PaaS bloquean `CREATE FUNCTION` o `CREATE TRIGGER`. `initDatabase.js` atrapa errores de triggers; si necesitas triggers en producción, ejecuta el script en una migración con permisos adecuados.
- Problemas al subir imágenes: verifica las variables `CLOUDINARY_*` y que `req.file` esté llegando (middleware `multer` configurado en `src/middleware/uploadMiddleware.js`).
- Stock negativo al crear ventas: controladores validan stock y hacen rollback si hay insuficiente stock.

---

## 🤝 Contribuciones

- Mantener el patrón de respuestas `{ success, message?, data? }`.
- Antes de cambiar esquema: actualizar `src/config/initDatabase.js` con migraciones idempotentes o preferir un sistema de migraciones.
- Documentar endpoints nuevos en este README y, si afectan DB, añadir scripts de migración y pruebas manuales.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 📬 Autores

*   **Equipo KEMGo**
