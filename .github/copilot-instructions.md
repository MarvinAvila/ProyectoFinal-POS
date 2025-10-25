## Resumen rápido

Este repositorio contiene dos componentes principales:

- backend-pos: API en Node.js (Express) con PostgreSQL (carpeta `backend-pos/`).
- frontend_pos: aplicación Flutter (carpeta `frontend_pos/`).

El objetivo de estas instrucciones es dar a agentes de codificación (Copilot/IA) orientación concreta y accionable para cambiar, depurar y extender el proyecto.

## Arquitectura y puntos clave

- Backend (backend-pos): carpeta `backend-pos/` organizada por `src/{config,controllers,models,routes,middleware,services,validations}`. El servidor arranca desde `server.js` y monta rutas bajo `/api/*`.
- Base de datos: PostgreSQL. La conexión está en `src/config/database.js`. Soporta `DATABASE_URL` (con SSL) o variables locales: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- Inicialización de BD: `src/config/initDatabase.js` contiene scripts SQL para crear tablas y triggers. `server.js` expone `POST /api/init-db` y automáticamente intenta inicializar al arrancar.
- Frontend (frontend_pos): aplicación Flutter. Configuración en `pubspec.yaml`. Código principal en `lib/` (p. ej. `lib/main.dart`). Usa paquetes como `dio`, `provider`, `mobile_scanner`, `google_mlkit_barcode_scanning`.

## Convenciones y patrones específicos del proyecto

- Rutas y controladores: cada ruta en `src/routes/*.js` está ligada a un controlador en `src/controllers/*Controller.js`. Las respuestas JSON siguen el patrón `{ success: boolean, message: string, ... }`.
- Nombres de tablas/columnas en la BD: se usan nombres en plural (e.g. `productos`, `ventas`, `alertas`) y columnas con prefijos tipo `id_producto`.
- Logs y observabilidad: `morgan` se usa en `server.js`. Para debugging de consultas existe la variable `DB_LOG_QUERIES=true` que hace log de queries en `src/config/database.js`.
- Scripts de npm: `backend-pos/package.json` define:
  - `npm run start` → arranca con `node server.js`.
  - `npm run dev` → arranca con `nodemon server.js`.

## Comandos y workflow de desarrollo (rápido)

- Backend (local):
  - Instalar dependencias: desde `backend-pos/` ejecutar `npm install`.
  - Levantar en desarrollo: `npm run dev` (usa `nodemon`).
  - Levantar en producción/local sin watcher: `npm start`.
  - Health-check: GET `http://localhost:3000/api/health` (muestra info de BD).
  - Inicializar BD manual: POST `http://localhost:3000/api/init-db`.

- Variables de entorno importantes (archivo `.env` esperado):
  - `PORT` (opcional)
  - `DATABASE_URL` (o `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
  - `DB_LOG_QUERIES=true` (opcional para depurar SQL)

- Frontend (Flutter):
  - Instalar dependencias: desde `frontend_pos/` ejecutar `flutter pub get`.
  - Ejecutar en dispositivo/emulador: `flutter run`.
  - Empaquetar: `flutter build apk` / `flutter build ipa` (según plataforma).

## Integración front↔back y ejemplos de endpoints importantes

- El backend expone las rutas principales montadas en `server.js`:
  - `/api/auth`, `/api/usuarios`, `/api/productos`, `/api/proveedores`, `/api/ventas`, `/api/reportes`, `/api/categorias`, `/api/alertas`, `/api/dashboard`, `/api/inventario`, `/api/ofertas`, `/api/comprobantes`, `/api/detalle-venta`, `/api/producto-oferta`, `/api/chatbot`, `/api/barcodes`.
- Ejemplos concretos:
  - Obtener productos: GET `/api/productos`
  - Crear venta: POST `/api/ventas` (espera payload con detalles de venta y luego se insertan `detalle_venta`).
  - Generar reportes: POST/GET en `/api/reportes` (revisar `src/controllers/reporteController.js`).

## Archivos/ubicaciones que mirar primero al modificar comportamiento

- `backend-pos/server.js` — punto de entrada, registro de rutas y rutas admin (`/api/init-db`, `/api/db-info`).
- `backend-pos/src/config/database.js` — pool de Postgres y configuración SSL/LOCAL.
- `backend-pos/src/config/initDatabase.js` — script SQL y creación de triggers.
- `backend-pos/package.json` — scripts y dependencias.
- `frontend_pos/pubspec.yaml` y `frontend_pos/lib/main.dart` — dependencias y punto de entrada Flutter.

## Errores comunes y cómo verificarlos rápidamente

- Si el servidor falla por BD: comprobar variables de entorno y ejecutar `curl http://localhost:3000/api/health` para ver error de conexión.
- Si faltan tablas o columnas: usar `POST /api/init-db` o revisar `src/config/initDatabase.js` para ver el script SQL esperado.
- Para reproducir problemas del frontend: asegurarse de que la app apunte al URL del backend correcto (habitualmente `http://localhost:3000`). Verificar permisos de cámara si fallan scanners.

## Restricciones y notas operativas

- No hay tests automatizados en el repo (no hay `test` en backend). Evitar suposiciones sobre cobertura de pruebas.
- `initDatabase.js` crea triggers; algunos hosts (p. ej. servicios serverless) pueden bloquear la creación de funciones/triggers — por eso `crearTriggers()` está separado y envuelto en try/catch.

## Qué espero del agente (concrete tasks)

- Al editar endpoints: mantener el patrón de respuesta `{ success, message, ... }` y usar `db.query(...)` o `db.getClient()` para transacciones explicitas.
- Para cambios en DB: actualizar `src/config/initDatabase.js` e incluir migraciones idempotentes (usar `IF NOT EXISTS`).
- Al agregar dependencias backend, actualizar `backend-pos/package.json` y documentar el cambio en `backend-pos/README.md`.

## Preguntas frecuentes que puedo hacerte para aclarar cambios

- ¿Deseas que la inicialización de BD ocurra automáticamente al iniciar o prefieres endpoint manual? (actualmente intenta inicializar al arrancar y expone `/api/init-db`).
- ¿La app Flutter usará un backend remoto o local durante desarrollo? Indica la URL base para ajustar variables de entorno en el cliente.

---

Si algo aquí quedó oscuro o quieres que añada ejemplos concretos (por ejemplo, payloads de `POST /api/ventas` o rutas exactas de controladores), dime cuáles y los incluyo en la siguiente iteración.
