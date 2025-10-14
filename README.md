# 🚀 Inventoria Backend - Sistema de Gestión y Autenticación

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat&logo=json-web-tokens&logoColor=white)](https://jwt.io/)
[![Winston](https://img.shields.io/badge/Winston-Logging-178828?style=flat&logo=winston&logoColor=white)](https://github.com/winstonjs/winston)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-En%20Desarrollo-yellow.svg)](https://github.com/Dallex-MT/InventorIA_Back)

## 📋 Descripción del Proyecto

**Inventoria Backend** es un sistema robusto de autenticación y gestión de usuarios desarrollado con Node.js y TypeScript, diseñado específicamente para aplicaciones de inventario y gestión empresarial. Este backend proporciona una API RESTful segura y escalable que permite el control completo de usuarios, roles y autenticación mediante tokens JWT.

### 🎯 Propósito
Proporcionar una base sólida y segura para aplicaciones de gestión de inventarios, con autenticación avanzada, manejo centralizado de errores y un sistema de logging optimizado para trazabilidad y análisis.

### 👥 Audiencia Objetivo
- Desarrolladores de software empresarial
- Equipos de desarrollo de sistemas de inventario
- Estudiantes de ingeniería de software
- Profesionales que requieren sistemas de autenticación robustos y soluciones de logging eficientes.

## 🎯 Objetivos del Proyecto

1.  **🔐 Seguridad Avanzada**: Implementar autenticación JWT con cookies HTTP-only, prevención de SQL injection y validación exhaustiva de datos para garantizar la máxima seguridad del sistema.
2.  **⚡ Rendimiento y Escalabilidad**: Desarrollar una arquitectura modular y eficiente que permita el crecimiento del sistema sin pérdida de rendimiento, utilizando TypeScript para mayor robustez y un sistema de logging asíncrono.
3.  **🛠️ Facilidad de Integración**: Proporcionar una API RESTful bien documentada y fácil de integrar con frontend de cualquier tecnología, siguiendo estándares industriales y ofreciendo logs claros para depuración.
4.  **📊 Trazabilidad y Monitoreo**: Implementar un sistema de logging estructurado y rotativo que capture eventos de acceso, aplicación y errores, facilitando la depuración, el monitoreo y el análisis de seguridad.

## 🏗️ Estructura del Proyecto

```
inventoria_back/
├── 📁 src/                          # Código fuente principal
│   ├── 🎮 controllers/               # Controladores de rutas
│   │   ├── AuthController.ts       # Controlador de autenticación
│   │   ├── DetalleFacturaController.ts # Controlador para detalles de factura
│   │   ├── FacturaController.ts    # Controlador para facturas
│   │   ├── ProductoController.ts   # Controlador para productos
│   │   └── RolController.ts          # Controlador de roles
│   ├── 🛡️ middleware/              # Middleware de seguridad y utilidades
│   │   └── auth.ts                  # Autenticación y autorización
│   ├── 📊 models/                   # Modelos de datos TypeScript
│   │   ├── DetalleFactura.ts       # Modelo de detalles de factura
│   │   ├── Factura.ts              # Modelo de facturas
│   │   ├── Producto.ts             # Modelo de productos
│   │   ├── Rol.ts                   # Modelo de roles
│   │   └── Usuario.ts               # Modelo de usuarios
│   ├── 🛣️ routes/                   # Definición de rutas API
│   │   ├── auth.ts                  # Rutas de autenticación
│   │   ├── detalleFacturaRoutes.ts # Rutas de detalles de factura
│   │   ├── facturaRoutes.ts        # Rutas de facturas
│   │   ├── productoRoutes.ts       # Rutas de productos
│   │   └── rolRoutes.ts             # Rutas de roles
│   ├── ⚙️ services/                 # Lógica de negocio
│   │   ├── DetalleFacturaService.ts # Servicio de detalles de factura
│   │   ├── FacturaService.ts       # Servicio de facturas
│   │   ├── ProductoService.ts      # Servicio de productos
│   │   ├── RolService.ts            # Servicio de roles
│   │   └── UsuarioService.ts        # Servicio de usuarios
│   ├── 🛠️ utils/                    # Utilidades y helpers
│   │   ├── database.ts              # Conexión MySQL
│   │   ├── jwt.ts                   # Gestión de tokens JWT
│   │   ├── logger.ts                # Sistema de logging con Winston
│   │   ├── password.ts              # Hashing de contraseñas
│   │   └── validation.ts            # Validaciones
│   └── index.ts                     # Punto de entrada principal
├── 📄 package.json                  # Dependencias y scripts
├── 📄 tsconfig.json                 # Configuración TypeScript
├── 📄 nodemon.json                  # Configuración desarrollo
├── 📄 .gitignore                    # Archivos ignorados por Git
└── 📄 README.md                     # Este archivo
```

## 🛠️ Tecnologías Utilizadas

### 🔧 Dependencias Principales
-   **[Node.js](https://nodejs.org/)** - Entorno de ejecución JavaScript
-   **[TypeScript](https://www.typescriptlang.org/)** - Superset de JavaScript con tipado estático
-   **[Express.js](https://expressjs.com/)** - Framework web minimalista para Node.js
-   **[MySQL2](https://www.npmjs.com/package/mysql2)** - Cliente MySQL de alto rendimiento
-   **[JWT](https://jwt.io/)** - JSON Web Tokens para autenticación segura
-   **[bcrypt](https://www.npmjs.com/package/bcrypt)** - Librería para hashing seguro de contraseñas
-   **[Helmet](https://helmetjs.github.io/)** - Colección de middleware para asegurar aplicaciones Express
-   **[CORS](https://www.npmjs.com/package/cors)** - Middleware para habilitar Cross-Origin Resource Sharing
-   **[Cookie-Parser](https://www.npmjs.com/package/cookie-parser)** - Middleware para parsear cookies HTTP
-   **[Winston](https://github.com/winstonjs/winston)** - Librería de logging versátil y extensible
-   **[winston-daily-rotate-file](https://github.com/winstonjs/winston-daily-rotate-file)** - Transporte de Winston para rotación diaria de archivos de log

### 🧰 Herramientas de Desarrollo
-   **[Nodemon](https://nodemon.io/)** - Utilidad para reiniciar automáticamente la aplicación durante el desarrollo
-   **[ts-node](https://typestrong.org/ts-node/)** - Ejecución directa de archivos TypeScript sin compilación previa
-   **[TypeScript](https://www.typescriptlang.org/)** - Compilador de TypeScript

## 🚀 Instalación

### 📋 Requisitos Previos
-   Node.js (versión 20.x o superior)
-   MySQL Server (versión 8.x o superior)
-   npm (gestor de paquetes de Node.js) o yarn

### 🔧 Pasos de Instalación

1.  **Clonar el repositorio**
    Abre tu terminal y ejecuta el siguiente comando para clonar el proyecto:
    ```bash
    git clone https://github.com/Dallex-MT/InventorIA_Back.git
    cd InventorIA_Back
    ```

2.  **Instalar dependencias**
    Navega al directorio del proyecto y instala todas las dependencias necesarias:
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno**
    Crea un archivo `.env` en la raíz del proyecto copiando el ejemplo y edítalo con tus credenciales de MySQL y configuración JWT:
    ```bash
    cp .env.example .env
    # Abre el archivo .env y configura las variables como:
    # DB_HOST=localhost
    # DB_USER=root
    # DB_PASSWORD=your_password
    # DB_NAME=inventoria_db
    # JWT_SECRET=your_jwt_secret_key
    # PORT=3000
    ```

4.  **Configurar la base de datos MySQL**
    Asegúrate de que tu servidor MySQL esté corriendo. Puedes crear la base de datos y las tablas manualmente o usar un script de migración si se proporciona.

5.  **Compilar y ejecutar**
    Para iniciar el servidor en modo desarrollo o producción:
    ```bash
    # Modo desarrollo (con auto-reinicio)
    npm run dev
    
    # Modo producción (compila y luego ejecuta)
    npm run build
    npm start
    ```

## 📖 Instrucciones de Uso

### 🏃‍♂️ Ejecutar el Proyecto Localmente

1.  **Desarrollo con auto-reinicio:**
    Para iniciar el servidor en modo desarrollo con `nodemon` (detecta cambios y reinicia automáticamente):
    ```bash
    npm run dev
    ```
    El servidor se ejecutará en `http://localhost:3000` (o el puerto configurado en `.env`) y los logs de acceso y aplicación se generarán en la carpeta `logs/`.

2.  **Producción:**
    Para compilar el código TypeScript a JavaScript y luego ejecutar la versión compilada:
    ```bash
    npm run build    # Compilar TypeScript a JavaScript
    npm start        # Ejecutar servidor compilado
    ```
    El servidor estará disponible en el puerto configurado.

3.  **Verificar funcionamiento:**
    Puedes verificar que el servidor está funcionando correctamente haciendo una petición al endpoint de salud:
    ```bash
    curl http://localhost:3000/health
    # Respuesta esperada: {"status":"OK","message":"Servidor funcionando correctamente"}
    ```

### 📊 Acceso a Logs
Los logs de acceso HTTP, aplicación y errores se guardan en la carpeta `logs/` en la raíz del proyecto, con rotación diaria y sanitización de datos sensibles.

## 🤝 Cómo Contribuir

¡Nos encantaría que contribuyas al desarrollo de Inventoria Backend! Sigue estos pasos para realizar tus aportaciones:

### 🔄 Flujo de Contribución

1.  **Fork el proyecto**
    Haz clic en el botón "Fork" en la parte superior derecha de la página de GitHub del repositorio. Luego, clona tu fork a tu máquina local:
    ```bash
    git clone https://github.com/tu-usuario/InventorIA_Back.git
    cd InventorIA_Back
    ```

2.  **Crea una rama para tu feature**
    Crea una nueva rama para tu desarrollo. Es una buena práctica usar nombres descriptivos para las ramas:
    ```bash
    git checkout -b feature/nombre-de-tu-feature
    # Ejemplo: git checkout -b feature/implementar-modulo-reportes
    ```

3.  **Desarrolla tu contribución**
    -   Asegúrate de seguir las convenciones de código existentes en el proyecto.
    -   Añade pruebas unitarias o de integración si tu cambio lo requiere.
    -   Documenta cualquier nueva funcionalidad o cambio significativo.

4.  **Commit tus cambios**
    Realiza commits con mensajes claros y concisos, siguiendo la guía de commits:
    ```bash
    git add .
    git commit -m "feat: descripción breve del cambio"
    # Ejemplo: git commit -m "feat: añadir endpoint para reportes de ventas"
    ```

5.  **Push a tu rama**
    Sube tus cambios a tu repositorio fork en GitHub:
    ```bash
    git push origin feature/nombre-de-tu-feature
    ```

6.  **Abre un Pull Request (PR)**
    Ve a la página de GitHub de tu repositorio fork y haz clic en "New Pull Request". Describe claramente tus cambios, el problema que resuelve y cualquier consideración adicional. Referencia cualquier issue relacionado.

### 📋 Guía de Commits
Utilizamos una convención de mensajes de commit para mantener un historial limpio y legible:
-   `feat:` - Nueva funcionalidad
-   `fix:` - Corrección de bugs
-   `docs:` - Cambios en la documentación
-   `style:` - Cambios de formato que no afectan el significado del código (espacios en blanco, formato, puntos y comas, etc.)
-   `refactor:` - Un cambio de código que no corrige un error ni añade una característica
-   `test:` - Añadir o modificar tests
-   `chore:` - Cambios en el proceso de construcción o herramientas auxiliares y librerías (por ejemplo, generación de documentación)

## 📜 Historial de Cambios

### Versión 1.2.0 - 15/07/2024
-   ✅ **Sistema de Logging Optimizado**: Implementación de Winston y `winston-daily-rotate-file` para logs estructurados, rotación diaria y sanitización de datos sensibles.
-   🗑️ **Eliminación de Dependencias Innecesarias**: `morgan` y `@types/morgan` desinstalados.
-   📝 **Actualización de `.gitignore`**: Exclusión de archivos de log.

### Versión 1.1.0 - 07/10/2024
-   ✅ **Autenticación por cookies HTTP-only** implementada.
-   🔒 **Seguridad mejorada** con cookies SameSite y Secure.
-   🚀 **Eliminación de tokens en respuestas** por seguridad.
-   🛠️ **Actualización de middleware** para soporte de cookies.

### Versión 1.0.0 - 06/10/2024
-   🎯 **Sistema de autenticación JWT** completo.
-   🛡️ **Validación de datos** exhaustiva.
-   📊 **Conexión MySQL** con consultas preparadas.
-   🚀 **Arquitectura modular** inicial.
-   📚 **Documentación API** completa.

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT. Puedes encontrar los detalles completos en el archivo [LICENSE](LICENSE) en la raíz del repositorio.

## 👨‍💻 Créditos

Desarrollado con ❤️ por **DXM** - Equipo de Desarrollo de Software.

-   **Desarrollo Principal**: DXM
-   **Diseño de Arquitectura**: DXM
-   **Documentación**: DXM

## 🎓 Nota Final

> **📚 Proyecto Educativo y de Práctica**
>
> Este proyecto fue desarrollado con fines educativos para demostrar buenas prácticas en desarrollo backend, seguridad web, arquitectura de software y gestión de logs. Es ideal para estudiantes, desarrolladores principiantes y profesionales que desean aprender sobre:
> -   🔐 Seguridad en aplicaciones web
> -   🏗️ Arquitectura de APIs RESTful
> -   🛠️ Desarrollo con TypeScript y Node.js
> -   🚀 Mejores prácticas en autenticación y logging
>
> ¡Siéntete libre de usarlo como base para tus propios proyectos y aprendizaje!

---

<p align="center">
  <strong>⭐ Si este proyecto te fue útil, ¡no olvides darle una estrella! ⭐</strong>
</p>