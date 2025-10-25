# 📛 KioskoGo - Sistema de Punto de Venta

Sistema completo para la gestión de ventas, productos, inventario y usuarios. Está compuesto por un frontend desarrollado en Flutter y un backend en Node.js con Express y PostgreSQL.

---

## 📦 Estructura del Monorepo

Este repositorio está organizado como un monorepo que contiene los dos componentes principales del sistema:

```
/
├── backend-pos/      # API REST (Node.js + Express)
├── frontend_pos/     # Interfaz de usuario (Flutter)
├── .github/          # Configuraciones de Copilot, workflows, etc.
└── README.md         # Este archivo
```

---

## 🔗 Subproyectos

Cada subproyecto tiene su propia documentación detallada. Por favor, consúltalos para obtener información específica sobre la arquitectura, configuración y despliegue de cada parte.

*   **[📄 README del Backend](./backend-pos/README.md)**: Guía de arquitectura, endpoints, patrones de diseño y configuración de la API.
*   **[📄 README del Frontend](./frontend_pos/README.md)**: Instrucciones de instalación, estructura del proyecto y comandos para la aplicación Flutter.

---

## ⚙️ Requisitos Globales

Para ejecutar el sistema completo en un entorno de desarrollo local, necesitarás:

*   **Node.js**: `v18.x` o superior.
*   **Flutter SDK**: `v3.x` o superior.
*   **PostgreSQL**: Una instancia local o remota accesible.

---

## 🚀 Instalación y Ejecución del Sistema Completo

Sigue estos pasos para levantar ambos servicios y tener el sistema funcionando localmente.

1.  **Clonar el repositorio**
    ```bash
    git clone https://github.com/MarvinAvila/ProyectoFinal-POS.git
    cd ProyectoFinal-POS
    ```

2.  **Instalar dependencias del Backend**
    ```bash
    cd backend-pos
    npm install
    ```

3.  **Instalar dependencias del Frontend**
    ```bash
    cd ../frontend_pos
    flutter pub get
    ```

4.  **Configurar y ejecutar el Backend**
    *   En la carpeta `backend-pos/`, crea un archivo `.env` (puedes usar `.env.example` como plantilla) y configura tus credenciales de PostgreSQL.
    *   Inicia el servidor de backend:
    ```bash
    # Desde la carpeta backend-pos/
    npm run dev
    ```
    El backend estará disponible en `http://localhost:3000`.

5.  **Configurar y ejecutar el Frontend**
    *   En la carpeta `frontend_pos/`, crea un archivo `.env` y define la variable `API_BASE_URL`. Para un emulador de Android, usa `http://10.0.2.2:3000/api`.
    *   Inicia la aplicación Flutter:
    ```bash
    # Desde la carpeta frontend_pos/
    flutter run
    ```

---

## 🌐 Comunicación entre Frontend y Backend

*   **Protocolo**: El frontend se comunica con el backend a través de una **API REST**.
*   **URL Base**: La URL por defecto del backend en desarrollo es `http://localhost:3000/api`. El frontend debe configurarse para apuntar a esta dirección.
*   **Autenticación**: Las rutas protegidas del backend esperan un **JSON Web Token (JWT)** en el header `Authorization: Bearer <token>`. El frontend es responsable de almacenar este token (usando `shared_preferences`) después del login y adjuntarlo en las peticiones subsecuentes.
*   **CORS**: El backend está configurado con el middleware `cors` para permitir peticiones desde los orígenes donde se ejecute el frontend.

---

## 🧪 Pruebas

*   **Backend**: Actualmente no cuenta con un conjunto de pruebas automatizadas. Se recomienda implementar pruebas de integración con **Jest** y **Supertest**.
*   **Frontend**: Puedes ejecutar el analizador estático de Dart para verificar la calidad del código:
    ```bash
    # Desde la carpeta frontend_pos/
    flutter analyze
    ```

---

## 📄 Licencia

Este proyecto está distribuido bajo la **Licencia MIT**. Puedes ver los detalles en los archivos de licencia de cada subproyecto.

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para proponer cambios, por favor sigue el flujo estándar de GitHub:

1.  Haz un *fork* del repositorio.
2.  Crea una nueva rama para tu funcionalidad.
3.  Realiza tus cambios y haz *commit*.
4.  Asegúrate de que tu código sigue las guías de estilo de cada subproyecto.
5.  Crea un *Pull Request* hacia la rama `main` o `develop` del repositorio original.

---

## 📬 Contacto

Este proyecto es mantenido por el **Equipo KEMGo**.