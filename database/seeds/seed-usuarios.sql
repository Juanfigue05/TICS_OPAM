-- ============================================================================
-- ARCHIVO: database/seed-usuarios-iniciales.sql
-- DESCRIPCIÓN: Crea dos usuarios iniciales importantes:
--               1. ADMINISTRADOR (superusuario)
--               2. TICS (técnico con permisos operativos)
--
-- CREDENCIALES INICIALES (cámbialas inmediatamente después del primer login):
--   ADMINISTRADOR → admin / admin123
--   TICS          → tics  / tics12
--
-- IMPORTANTE:
--   - Estas son credenciales de desarrollo/pruebas
--   - Cámbialas en producción por contraseñas FUERTES
--   - Ejecutar SOLO una vez o después de TRUNCATE si es entorno de pruebas
-- ============================================================================

USE tics_aeropuerto;

-- ============================================================================
-- LIMPIEZA (opcional - descomentar solo en desarrollo/pruebas)
-- ============================================================================
-- DELETE FROM Usuarios_sistema 
-- WHERE username IN ('admin', 'tics');

-- DELETE FROM Personas 
-- WHERE correo_asignado IN ('admin@opam.com.co', 'tics@opam.com.co');

-- ============================================================================
-- 1. USUARIO ADMINISTRADOR
-- ============================================================================

-- Crear la persona asociada
INSERT INTO Personas (
    nombre, 
    correo_asignado, 
    cargo, 
    rol, 
    area, 
    celular, 
    extension, 
    activo
) VALUES (
    'LEONARDO CASAS',
    'admin@opam.com.co',
    'JEFE DE TICS',
    'ADMINISTRADOR',
    'SOPORTE TECNICO',
    '3017778899',
    '1139',
    true
);

-- Crear usuario de sistema
-- Contraseña en plano: admin123
-- Hash bcrypt (10 rondas) generado para esta contraseña
INSERT INTO Usuarios_sistema (
    username,
    password_hash,
    id_persona,
    rol,
    activo
) VALUES (
    'admin',
    '$2b$10$2WeGxQx7pLl/2wOTqCm88OLU6oY9TRI.jvHZnOQaLcvPwtNdQlnYi',
    LAST_INSERT_ID(),
    'ADMINISTRADOR',
    true
);

-- ============================================================================
-- 2. USUARIO TICS
-- ============================================================================

-- Crear la persona asociada
INSERT INTO Personas (
    nombre, 
    correo_asignado, 
    cargo, 
    rol, 
    area, 
    celular, 
    extension, 
    activo
) VALUES (
    'ELIOT SAMUEL MARTINEZ',
    'tics@opam.com.co',
    'AUXILIAR TICS',
    'TICS',
    'SOPORTE TECNICO',
    '3017778899',
    '1138',
    true
);

-- Crear usuario de sistema
-- Contraseña en plano: tics12
-- Hash bcrypt (10 rondas) generado para esta contraseña
INSERT INTO Usuarios_sistema (
    username,
    password_hash,
    id_persona,
    rol,
    activo
) VALUES (
    'tics',
    '$2b$10$2WeGxQx7pLl/2wOTqCm88OaTocQnb4sdsskYZ8y3SKn7ll6IGc9PW',
    LAST_INSERT_ID(),
    'TICS',
    true
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT 
    u.username,
    u.rol                  AS rol_sistema,
    u.activo               AS usuario_activo,
    p.nombre,
    p.correo_asignado,
    p.rol                  AS rol_en_personas,
    p.area,
    p.celular,
    DATE_FORMAT(u.fecha_creacion, '%Y-%m-%d %H:%i') AS creado
FROM Usuarios_sistema u
JOIN Personas p ON u.id_persona = p.id_persona
WHERE u.username IN ('admin', 'tics')
ORDER BY u.username;

-- Resumen final
SELECT '=====================================' AS separator;
SELECT '✅ Usuarios iniciales creados exitosamente' AS mensaje;
SELECT '👤 ADMINISTRADOR → username: admin     | contraseña: admin123' AS admin_cred;
SELECT '👷 TICS         → username: tics      | contraseña: tics12'   AS tics_cred;
SELECT '⚠️ CAMBIA ESTAS CONTRASEÑAS EN EL PRIMER USO (ENTORNO REAL)' AS aviso_seguridad;
SELECT '=====================================' AS separator;

-- Opcional: conteo total
SELECT COUNT(*) AS total_usuarios_sistema FROM Usuarios_sistema;