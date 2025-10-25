# KioskoGo - Frontend POS

Interfaz de usuario desarrollada en Flutter para el sistema de Punto de Venta (POS). Esta aplicación permite la gestión de ventas, productos, inventario y reportes, interactuando directamente con el `backend-pos`.

## 📘 Contexto del Monorepo

Este frontend es una parte integral de un monorepo que también incluye el backend-pos. Ambas partes están diseñadas para funcionar juntas. Para una visión completa del proyecto, por favor, consulta el README del backend.

---

## 🚀 Tecnologías Utilizadas

*   **Framework**: Flutter
*   **Lenguaje**: Dart
*   **Gestión de Estado**: Provider / BLoC *(Nota: especificar cuál se está usando)*
*   **Comunicación HTTP**: Paquete `http` o `dio` para las llamadas a la API REST.
*   **Navegación**: `Navigator 2.0` o `go_router`.
*   **Almacenamiento Local**: `shared_preferences` para guardar datos de sesión como tokens JWT.
*   **Herramientas de Desarrollo**:
    *   Visual Studio Code / Android Studio
    *   Flutter DevTools
    *   Linter configurado con `analysis_options.yaml`.

---

## 🛠️ Instalación y Configuración

Sigue estos pasos para poner en marcha el entorno de desarrollo local.

### Requisitos Previos

*   Flutter SDK (versión 3.x o superior).
*   Un editor de código como VS Code con la extensión de Flutter o Android Studio.
*   Un emulador de Android, simulador de iOS o un dispositivo físico conectado.

### 1. Instalar Dependencias

Navega a la carpeta del proyecto y ejecuta el siguiente comando para descargar todas las dependencias de Dart y Flutter.

```bash
flutter pub get
```

### 2. Variables de Entorno

Este proyecto necesita saber la URL base del backend para realizar las llamadas a la API. Crea un archivo `.env` en la raíz de `frontend_pos/` y añade la siguiente variable.

**Ejemplo de archivo `.env`:**

```
# URL del backend-pos. Asegúrate de que sea accesible desde tu emulador/dispositivo.
# Si el backend corre en localhost en tu PC, usa 10.0.2.2 para el emulador de Android.
API_BASE_URL=http://10.0.2.2:3000/api
```

*(Nota: El proyecto debe estar configurado para leer este archivo, usualmente con el paquete `flutter_dotenv`)*.

---

## 📜 Scripts y Comandos Disponibles

*   **Iniciar la aplicación en modo debug:**
    ```bash
    flutter run
    ```

*   **Ejecutar el linter y analizador de código:**
    ```bash
    flutter analyze
    ```

*   **Compilar la aplicación para producción (Android):**
    ```bash
    flutter build apk --release
    ```

*   **Compilar la aplicación para producción (iOS):**
    ```bash
    flutter build ipa --release
    ```

---

## 📁 Estructura del Proyecto

El código fuente se encuentra principalmente dentro de la carpeta `lib/`. La estructura sigue las convenciones de la comunidad de Flutter:

```
/lib
├── /assets           # Imágenes, fuentes y otros archivos estáticos.
├── /models           # Clases de modelo de datos (Producto, Venta, etc.).
├── /providers        # Lógica de estado (si se usa Provider).
├── /screens          # Vistas principales de la aplicación (pantalla de login, dashboard, etc.).
├── /services         # Lógica para interactuar con APIs externas (ApiService, AuthService).
├── /utils            # Funciones de utilidad, constantes y helpers.
├── /widgets          # Componentes de UI reutilizables (botones, tarjetas, campos de texto).
└── main.dart         # Punto de entrada de la aplicación.
```

---

## 🚀 Uso

1.  Asegúrate de que el `backend-pos` esté en ejecución.
2.  Inicia un emulador o conecta un dispositivo físico.
3.  Ejecuta `flutter run` desde la terminal en la carpeta `frontend_pos`.

La aplicación se iniciará y mostrará la pantalla de login.

*(Aquí puedes añadir capturas de pantalla de la aplicación)*

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor, sigue estas pautas:
1.  Crea un *fork* del repositorio.
2.  Crea una nueva rama para tu funcionalidad (`git checkout -b feature/nombre-feature`).
3.  Asegúrate de que tu código pase el linter (`flutter analyze`).
4.  Haz un *Pull Request* a la rama `main` o `develop` del repositorio original.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 👨‍💻 Autores

*   **Equipo KEMGo**

