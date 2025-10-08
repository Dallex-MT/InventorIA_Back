# 🚀 Inventoria Backend - Sistema de Gestión y Autenticación

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat&logo=json-web-tokens&logoColor=white)](https://jwt.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-En%20Desarrollo-yellow.svg)](https://github.com/tu-usuario/inventoria_back)

## 📋 Descripción del Proyecto

**Inventoria Backend** es un sistema robusto de autenticación y gestión de usuarios desarrollado con Node.js y TypeScript, diseñado específicamente para aplicaciones de inventario y gestión empresarial. Este backend proporciona una API RESTful segura y escalable que permite el control completo de usuarios, roles y autenticación mediante tokens JWT.

### 🎯 Propósito
Proporcionar una base sólida y segura para aplicaciones de gestión de inventarios, con autenticación avanzada y manejo centralizado de errores.

### 👥 Audiencia Objetivo
- Desarrolladores de software empresarial
- Equipos de desarrollo de sistemas de inventario
- Estudiantes de ingeniería de software
- Profesionales que requieren sistemas de autenticación robustos

## 🎯 Objetivos del Proyecto

1. **🔐 Seguridad Avanzada**: Implementar autenticación JWT con cookies HTTP-only, prevención de SQL injection y validación exhaustiva de datos para garantizar la máxima seguridad del sistema.

2. **⚡ Rendimiento y Escalabilidad**: Desarrollar una arquitectura modular y eficiente que permita el crecimiento del sistema sin pérdida de rendimiento, utilizando TypeScript para mayor robustez.

3. **🛠️ Facilidad de Integración**: Proporcionar una API RESTful bien documentada y fácil de integrar con frontend de cualquier tecnología, siguiendo estándares industriales.

## 🏗️ Estructura del Proyecto

```
inventoria_back/
├── 📁 src/                          # Código fuente principal
│   ├── 🎮 controllers/               # Controladores de rutas
│   │   ├── AuthController.ts       # Controlador de autenticación
│   │   └── RolController.ts          # Controlador de roles
│   ├── 🛡️ middleware/              # Middleware de seguridad
│   │   └── auth.ts                  # Autenticación y autorización
│   ├── 📊 models/                   # Modelos de datos TypeScript
│   │   ├── Rol.ts                   # Modelo de roles
│   │   └── Usuario.ts               # Modelo de usuarios
│   ├── 🛣️ routes/                   # Definición de rutas API
│   │   ├── auth.ts                  # Rutas de autenticación
│   │   └── rolRoutes.ts             # Rutas de roles
│   ├── ⚙️ services/                 # Lógica de negocio
│   │   ├── RolService.ts            # Servicio de roles
│   │   └── UsuarioService.ts        # Servicio de usuarios
│   ├── 🛠️ utils/                    # Utilidades
│   │   ├── database.ts              # Conexión MySQL
│   │   ├── jwt.ts                   # Gestión de tokens JWT
│   │   ├── password.ts              # Hashing de contraseñas
│   │   └── validation.ts            # Validaciones
│   └── index.ts                     # Punto de entrada principal
├── 📄 test_auth.js                  # Script de pruebas
├── 📄 test_cookie_auth.js           # Pruebas de autenticación por cookies
├── 📄 package.json                  # Dependencias y scripts
├── 📄 tsconfig.json                 # Configuración TypeScript
├── 📄 nodemon.json                  # Configuración desarrollo
├── 📄 .gitignore                    # Archivos ignorados por Git
└── 📄 README.md                     # Este archivo
```

## 🛠️ Tecnologías Utilizadas

### 🔧 Dependencias Principales
- **[Node.js](https://nodejs.org/)** - Entorno de ejecución JavaScript
- **[TypeScript](https://www.typescriptlang.org/)** - Superset de JavaScript con tipado estático
- **[Express.js](https://expressjs.com/)** - Framework web minimalista
- **[MySQL2](https://www.npmjs.com/package/mysql2)** - Cliente MySQL de alto rendimiento
- **[JWT](https://jwt.io/)** - JSON Web Tokens para autenticación
- **[bcrypt](https://www.npmjs.com/package/bcrypt)** - Hashing seguro de contraseñas
- **[Helmet](https://helmetjs.github.io/)** - Seguridad de headers HTTP
- **[CORS](https://www.npmjs.com/package/cors)** - Control de acceso entre dominios
- **[Cookie-Parser](https://www.npmjs.com/package/cookie-parser)** - Parsing de cookies HTTP
- **[Morgan](https://www.npmjs.com/package/morgan)** - Logging de peticiones HTTP

### 🧰 Herramientas de Desarrollo
- **[Nodemon](https://nodemon.io/)** - Auto-reinicio en desarrollo
- **[ts-node](https://typestrong.org/ts-node/)** - Ejecución directa de TypeScript
- **[TypeScript](https://www.typescriptlang.org/)** - Compilador TypeScript

## 🚀 Instalación

### 📋 Requisitos Previos
- Node.js (versión 20.x o superior)
- MySQL Server (versión 8.x o superior)
- npm o yarn

### 🔧 Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/Dallex-MT/InventorIA_Back.git
   cd InventorIA_Back
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales de MySQL y configuración JWT
   ```

4. **Configurar la base de datos MySQL**

5. **Compilar y ejecutar**
   ```bash
   # Modo desarrollo
   npm run dev
   
   # Modo producción
   npm run build
   npm start
   ```

## 📖 Instrucciones de Uso

### 🏃‍♂️ Ejecutar el Proyecto Localmente

1. **Desarrollo con auto-reinicio:**
   ```bash
   npm run dev
   ```
   El servidor se ejecutará en `http://localhost:3000` con auto-reinicio ante cambios.

2. **Producción:**
   ```bash
   npm run build    # Compilar TypeScript a JavaScript
   npm start        # Ejecutar servidor compilado
   ```

3. **Verificar funcionamiento:**
   ```bash
   curl http://localhost:3000/health
   # Respuesta esperada: {"status":"OK","message":"Servidor funcionando correctamente"}
   ```

### 🧪 Pruebas de Autenticación

El proyecto incluye scripts de prueba para verificar el funcionamiento:

```bash
# Pruebas básicas de autenticación
node test_auth.js

# Pruebas de autenticación por cookies (seguridad mejorada)
node test_cookie_auth.js
```

## 🤝 Cómo Contribuir

¡Nos encantaría que contribuyas al desarrollo de Inventoria Backend! Sigue estos pasos:

### 🔄 Flujo de Contribución

1. **Fork el proyecto**
   ```bash
   # Haz clic en "Fork" en GitHub, luego:
   git clone https://github.com/Dallex-MT/InventorIA_Back.git
   cd InventorIA_Back
   ```

2. **Crea una rama para tu feature**
   ```bash
   git checkout -b feature/nombre-de-tu-feature
   # Ejemplo: git checkout -b feature/reset-password
   ```

3. **Desarrolla tu contribución**
   - Sigue las convenciones de código del proyecto
   - Añade tests si es posible
   - Documenta tus cambios

4. **Commit tus cambios**
   ```bash
   git add .
   git commit -m "feat: descripción breve del cambio"
   # Ejemplo: git commit -m "feat: add password reset functionality"
   ```

5. **Push a tu rama**
   ```bash
   git push origin feature/nombre-de-tu-feature
   ```

6. **Abre un Pull Request**
   - Ve a GitHub y haz clic en "New Pull Request"
   - Describe claramente tus cambios
   - Referencia cualquier issue relacionado

### 📋 Guía de Commits
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bugs
- `docs:` - Documentación
- `style:` - Cambios de formato
- `refactor:` - Refactorización de código
- `test:` - Añadir o modificar tests
- `chore:` - Tareas de mantenimiento

## 📜 Historial de Cambios

### Versión 1.1.0 - 07/10/2024
- ✅ **Autenticación por cookies HTTP-only** implementada
- 🔒 **Seguridad mejorada** con cookies SameSite y Secure
- 🚀 **Eliminación de tokens en respuestas** por seguridad
- 🛠️ **Actualización de middleware** para soporte de cookies

### Versión 1.0.0 - 06/10/2024
- 🎯 **Sistema de autenticación JWT** completo
- 🛡️ **Validación de datos** exhaustiva
- 📊 **Conexión MySQL** con consultas preparadas
- 🚀 **Arquitectura modular** inicial
- 📚 **Documentación API** completa

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Créditos

Desarrollado con ❤️ por **DXM** - Equipo de Desarrollo de Software

- **Desarrollo Principal**: DXM Team
- **Diseño de Arquitectura**: DXM Engineering
- **Documentación**: DXM Documentation Team

## 🎓 Nota Final

> **📚 Proyecto Educativo y de Práctica**
> 
> Este proyecto fue desarrollado con fines educativos para demostrar buenas prácticas en desarrollo backend, seguridad web y arquitectura de software. Es ideal para estudiantes, desarrolladores principiantes y profesionales que desean aprender sobre:
> - 🔐 Seguridad en aplicaciones web
> - 🏗️ Arquitectura de APIs RESTful
> - 🛠️ Desarrollo con TypeScript y Node.js
> - 🚀 Mejores prácticas en autenticación
> 
> ¡Siéntete libre de usarlo como base para tus propios proyectos y aprendizaje!

---

<p align="center">
  <strong>⭐ Si este proyecto te fue útil, ¡no olvides darle una estrella! ⭐</strong>
</p>