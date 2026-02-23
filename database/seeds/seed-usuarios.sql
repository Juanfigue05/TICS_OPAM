-- ============================================================================
-- ARCHIVO: database/seed-usuarios.sql  (CORREGIDO v2)
-- DESCRIPCIÓN: Crea el primer usuario administrador para hacer login.
--
-- CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR:
--   ✅ Columna corregida: `rol` (no `rol_sistema`, que no existe en el schema)
--   ✅ Hash bcrypt válido para la contraseña: admin123
--   ✅ Compatible con schema.sql v2.2
--
-- PASOS PARA EJECUTAR:
--   1. Asegúrate de haber ejecutado schema.sql primero
--   2. mysql -u root -p tics_aeropuerto < seed-usuarios.sql
--      O desde el cliente MySQL:
--      USE tics_aeropuerto;
--      source /ruta/seed-usuarios.sql
--
-- CREDENCIALES:
--   usuario:    admin
--   contraseña: admin123
--
-- ⚠️  CAMBIA LA CONTRASEÑA DESPUÉS DEL PRIMER LOGIN
-- ============================================================================

USE tics_aeropuerto;

-- Limpiar datos anteriores si existen (para re-ejecutar limpio)
DELETE FROM Usuarios_sistema WHERE username = 'admin';
DELETE FROM Personas WHERE correo_asignado = 'admin@tics.com';

-- Crear persona administrador
INSERT INTO Personas (nombre, correo_asignado, cargo, rol, area, activo)
VALUES ('LEONARDO CASAS', 'admin@tics.com', 'JEFE DE TICS', 'ADMINISTRADOR', 'TICS', true);

-- Crear usuario de login
-- Contraseña: admin123
-- Hash generado con bcrypt, salt rounds = 10
-- Para generar un nuevo hash en Node.js:
--   node -e "const b=require('bcrypt'); b.hash('admin123',10).then(h=>console.log(h));"
INSERT INTO Usuarios_sistema (username, password_hash, id_persona, rol, activo)
VALUES (
    'admin',
    '$2b$10$YCQB0w/LTGYiiZ7HbwCGGeF1BRrtCMGrAaFIkIBzD7qdASNFzSO6u',
    LAST_INSERT_ID(),
    'ADMINISTRADOR',
    true
);

-- ──────────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN
-- ──────────────────────────────────────────────────────────────────────────────
SELECT
    u.username,
    u.rol                  AS rol_sistema,
    u.activo               AS usuario_activo,
    p.nombre,
    p.correo_asignado,
    p.rol                  AS rol_persona,
    u.fecha_creacion
FROM Usuarios_sistema u
JOIN Personas p ON u.id_persona = p.id_persona
WHERE u.username = 'admin';

SELECT '✅ Usuario admin creado correctamente.'     AS Resultado;
SELECT '🔑 Contraseña inicial: admin123'             AS Credencial;
SELECT '⚠️  Cambia la contraseña en el primer login.' AS Aviso;


-- ──────────────────────────────────────────────────────────────────────────────
-- OPCIONAL: Crear usuarios adicionales de prueba
-- (Descomenta si los necesitas)
-- ──────────────────────────────────────────────────────────────────────────────

-- Usuario TICS (technician)
-- INSERT INTO Personas (nombre, correo_asignado, cargo, rol, area, activo)
-- VALUES ('Técnico TICS', 'tecnico@tics.com', 'Técnico TICS', 'TICS', 'Sistemas', true);
-- INSERT INTO Usuarios_sistema (username, password_hash, id_persona, rol, activo)
-- VALUES (
--     'tecnico',
--     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- tics123
--     LAST_INSERT_ID(),
--     'TICS',
--     true
-- );

-- Usuario VISITANTE (viewer)
-- INSERT INTO Personas (nombre, correo_asignado, cargo, rol, area, activo)
-- VALUES ('Visitante', 'visitante@tics.com', 'Consulta', 'VISITANTE', 'General', true);
-- INSERT INTO Usuarios_sistema (username, password_hash, id_persona, rol, activo)
-- VALUES (
--     'visitante',
--     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- visitante123
--     LAST_INSERT_ID(),
--     'VISITANTE',
--     true
-- );