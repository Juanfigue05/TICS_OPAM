# 🔐 SISTEMA DE AUTENTICACIÓN - DOCUMENTACIÓN

## 📦 DEPENDENCIAS INSTALADAS

```bash
npm install bcrypt jsonwebtoken
```

## 👥 ROLES Y PERMISOS

|        Rol        |    Código Sistema     |        Permisos      |         Acciones        |
|-------------------|-----------------------|----------------------|-------------------------|
| **VISITANTE**     |       `viewer`        |🔍 Solo lectura 🔍   | GET (consultar)         |
| **TICS**          |     `technician`      |  🔍🔍 + ✏️ + ➕    | GET, POST, PUT          |
| **ADMINISTRADOR** |       `admin`         |  🔍 + ✏️ + ➕ + 🗑️ | GET, POST, PUT, DELETE  |

---

## 📁 ARCHIVOS CREADOS

### 1. `backend/config/database.js`
- Conexión a MySQL
- Pool de conexiones
- Función helper `query()`

### 2. `backend/middleware/auth.js`
- `authenticateToken()` - Verifica JWT
- `requireRole([roles])` - Verifica rol específico
- `checkPermissions()` - Verifica permisos por método HTTP
- `protect()` - Middleware combinado

### 3. `backend/routes/auth.js`
- POST `/api/auth/login` - Iniciar sesión
- POST `/api/auth/register` - Registrar usuario (admin)
- GET `/api/auth/me` - Info usuario actual
- PUT `/api/auth/change-password` - Cambiar contraseña
- GET `/api/auth/usuarios` - Listar usuarios (admin)
- PUT `/api/auth/usuarios/:id` - Actualizar usuario (admin)
- DELETE `/api/auth/usuarios/:id` - Desactivar usuario (admin)

### 4. `backend/scripts/crear-usuarios.js`
- Script para crear usuarios iniciales
- Encripta contraseñas con bcrypt

---

## 🚀 CÓMO USAR

### 1. Configurar Variables de Entorno (.env)

```env
# JWT Secret (cambiar en producción)
JWT_SECRET=tu-clave-super-secreta-y-larga-aqui-2025

# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=tics_aeropuerto
```

### 2. Crear Usuarios Iniciales

```bash
node backend/scripts/crear-usuarios.js
```

**Resultado:**
```
👑 ADMINISTRADOR: admin / admin123
🔧 TICS: tics / tics123
👁️  VISITANTE: visitante / visitante123
```

### 3. Proteger Rutas en el Backend

```javascript
const { authenticateToken, requireRole, protect } = require('../middleware/auth');

// Solo usuarios autenticados
router.get('/computadores', authenticateToken, getComputadores);

// Solo TICS y ADMIN pueden crear
router.post('/computadores', 
    authenticateToken, 
    requireRole(['technician', 'admin']), 
    createComputador
);

// Solo ADMIN puede eliminar
router.delete('/computadores/:id', 
    authenticateToken, 
    requireRole(['admin']), 
    deleteComputador
);

// Auto-verificar permisos según método HTTP
router.use('/computadores', protect);
```

---

## 🔑 FLUJO DE AUTENTICACIÓN

### 1. **Login (Frontend)**

```javascript
// POST /api/auth/login
const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
    })
});

const data = await response.json();
// { success: true, token: "eyJhbGc...", usuario: {...} }

// Guardar token
localStorage.setItem('token', data.token);
localStorage.setItem('usuario', JSON.stringify(data.usuario));
```

### 2. **Usar Token en Peticiones**

```javascript
// Todas las peticiones después del login
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:3000/api/computadores', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
```

### 3. **Verificar Sesión**

```javascript
// GET /api/auth/me
const response = await fetch('http://localhost:3000/api/auth/me', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

const data = await response.json();
// { success: true, data: { nombre: "...", rol: "admin", ... } }
```

---

## 🛡️ SEGURIDAD

### Contraseñas
- ✅ Encriptadas con **bcrypt** (10 salt rounds)
- ✅ Nunca se almacenan en texto plano
- ✅ No se devuelven en las respuestas JSON

### JWT
- ✅ Firmado con clave secreta (JWT_SECRET)
- ✅ Expiración de 24 horas
- ✅ Contiene: id, username, rol, nombre

### Base de Datos
- ✅ Tabla `Usuarios_sistema` separada de `Personas`
- ✅ Campo `activo` para desactivar sin eliminar
- ✅ Registro de `ultimo_acceso`

---

## 📊 EJEMPLOS DE RESPUESTAS

### Login Exitoso
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": 1,
    "username": "admin",
    "nombre": "Administrador del Sistema",
    "rol": "admin",
    "correo": "admin@tics.com"
  }
}
```

### Login Fallido
```json
{
  "success": false,
  "error": "Usuario o contraseña incorrectos"
}
```

### Sin Permisos
```json
{
  "success": false,
  "error": "No tienes permisos para realizar esta acción.",
  "rol_requerido": ["admin"],
  "tu_rol": "technician"
}
```

### Token Expirado
```json
{
  "success": false,
  "error": "Token inválido o expirado."
}
```

---

## 🔄 CAMBIAR CONTRASEÑA

```javascript
// PUT /api/auth/change-password
const response = await fetch('http://localhost:3000/api/auth/change-password', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        password_actual: 'admin123',
        password_nueva: 'nuevaPassword456'
    })
});
```

---

## 👨‍💼 GESTIÓN DE USUARIOS (Solo ADMIN)

### Listar Usuarios
```javascript
// GET /api/auth/usuarios
const response = await fetch('http://localhost:3000/api/auth/usuarios', {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

### Actualizar Rol de Usuario
```javascript
// PUT /api/auth/usuarios/2
await fetch('http://localhost:3000/api/auth/usuarios/2', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        rol_sistema: 'admin'
    })
});
```

### Desactivar Usuario
```javascript
// DELETE /api/auth/usuarios/3
await fetch('http://localhost:3000/api/auth/usuarios/3', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🎯 PRÓXIMOS PASOS

1. ✅ Ejecutar script de usuarios: `node backend/scripts/crear-usuarios.js`
2. ✅ Probar login con Postman o frontend
3. ✅ Proteger todas las rutas según roles
4. ✅ Implementar logout en frontend (borrar token)
5. ✅ Implementar refresh token (opcional)

---

## ⚠️ IMPORTANTE

- **Cambiar JWT_SECRET** en producción (usar algo más largo y aleatorio)
- **No subir .env a Git** (ya está en .gitignore)
- **HTTPS en producción** (nunca enviar tokens por HTTP)
- **Expiración de tokens** ajustable según necesidad

---

**Sistema listo para autenticación segura con 3 niveles de acceso** ✅