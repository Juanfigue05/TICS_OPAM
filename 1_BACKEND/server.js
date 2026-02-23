// ============================================================================
// ARCHIVO: 1_backend/server.js
// Versión corregida - febrero 2026
//
// CORRECCIONES APLICADAS:
//   1. `query` importado desde database (faltaba en /api/stats)
//   2. Middleware: auth.JS → auth (minúsculas)
//   3. Frontend servido como archivos estáticos
//   4. PORT del servidor separado del DB_PORT
// ============================================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

// ── DB ───────────────────────────────────────────────────────────────────────
const { testConnection, query } = require('./config/database');   // ✅ query importado

// ── Rutas ────────────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const personaRoutes    = require('./routes/persona');
const computadorRoutes = require('./routes/computador');
const celularRoutes    = require('./routes/celular');
const impresoraRoutes  = require('./routes/impresora');
const radioRoutes      = require('./routes/radio');
const telefonoIPRoutes = require('./routes/telefono_ip');
const tabletRoutes     = require('./routes/tablet');
const accesorioRoutes  = require('./routes/accesorio');
const ubicacionRoutes  = require('./routes/ubicacion');
const historialRoutes  = require('./routes/historial');
const bodegaRoutes     = require('./routes/bodega');
const { authenticateToken } = require('./middleware/auth');        // ✅ sin .JS

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares ──────────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || `http://localhost:${PORT}`,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ Servir frontend estático (CSS, JS, imágenes, HTML de páginas)
app.use(express.static(path.join(__dirname, '../2_FRONTEND')));

// Logger desarrollo
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

// ── Rutas API ────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/personas',     personaRoutes);
app.use('/api/computadores', computadorRoutes);
app.use('/api/celulares',    celularRoutes);
app.use('/api/impresoras',   impresoraRoutes);
app.use('/api/radios',       radioRoutes);
app.use('/api/telefonos-ip', telefonoIPRoutes);
app.use('/api/tablets',      tabletRoutes);
app.use('/api/accesorios',   accesorioRoutes);
app.use('/api/ubicaciones',  ubicacionRoutes);
app.use('/api/historial',    historialRoutes);
app.use('/api/bodega',       bodegaRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success:   true,
        message:   'Servidor TICS Aeropuerto activo',
        uptime:    process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Stats (requiere auth)
app.get('/api/stats', authenticateToken, async (req, res) => {
    try {
        const results = await query(`           
            SELECT
                (SELECT COUNT(*) FROM Computadores WHERE activo = 'ACTIVO') AS computadores,
                (SELECT COUNT(*) FROM Celulares    WHERE activo = 'ACTIVO') AS celulares,
                (SELECT COUNT(*) FROM Impresoras   WHERE activo = 'ACTIVO') AS impresoras,
                (SELECT COUNT(*) FROM Radios       WHERE activo = 'ACTIVO') AS radios,
                (SELECT COUNT(*) FROM Telefonos_ip WHERE activo = 'ACTIVO') AS telefonos_ip,
                (SELECT COUNT(*) FROM Tablets      WHERE activo = 'ACTIVO') AS tablets,
                (SELECT COUNT(*) FROM Accesorios   WHERE activo = 'ACTIVO') AS accesorios
        `);
        const datos = results[0];
        res.json({
            success: true,
            data: {
                ...datos,
                total: Object.values(datos).reduce((a, b) => Number(a) + Number(b || 0), 0)
            }
        });
    } catch (err) {
        console.error('Error en /api/stats:', err.message);
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }
});

// Dashboard completo (requiere auth) — todos los datos para las gráficas
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const DEVICE_KEYS = ['computadores','celulares','impresoras','radios','telefonos_ip','tablets','accesorios'];

        const [statsRows, ubicRows, asigRows, rolesRows, histRows, personasRows, ultimosRows, marcasRows] = await Promise.all([

            // 1. Conteo de equipos activos por tipo
            query(`SELECT
                (SELECT COUNT(*) FROM Computadores WHERE activo = 'ACTIVO') AS computadores,
                (SELECT COUNT(*) FROM Celulares    WHERE activo = 'ACTIVO') AS celulares,
                (SELECT COUNT(*) FROM Impresoras   WHERE activo = 'ACTIVO') AS impresoras,
                (SELECT COUNT(*) FROM Radios       WHERE activo = 'ACTIVO') AS radios,
                (SELECT COUNT(*) FROM Telefonos_ip WHERE activo = 'ACTIVO') AS telefonos_ip,
                (SELECT COUNT(*) FROM Tablets      WHERE activo = 'ACTIVO') AS tablets,
                (SELECT COUNT(*) FROM Accesorios   WHERE activo = 'ACTIVO') AS accesorios`),

            // 2. Equipos asignados por ubicación (top 8)
            query(`
                SELECT u.Nombre_ubicacion AS nombre, COUNT(*) AS total
                FROM (
                    SELECT id_ubicacion FROM Computadores_persona WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT id_ubicacion FROM Celulares_persona    WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT id_ubicacion FROM Impresoras_ubicacion WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT id_ubicacion FROM Radios_persona       WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT id_ubicacion FROM Telefono_persona     WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT id_ubicacion FROM Tablets_persona      WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT id_ubicacion FROM Accesorios_persona   WHERE activo = 'ACTIVO'
                ) AS todos
                JOIN Ubicaciones u ON todos.id_ubicacion = u.id_ubicacion
                WHERE u.activo = true
                GROUP BY u.id_ubicacion, u.Nombre_ubicacion
                ORDER BY total DESC
                LIMIT 8`),

            // 3. Asignados vs sin asignar por tipo principal
            query(`SELECT
                (SELECT COUNT(*) FROM Computadores WHERE activo = 'ACTIVO') AS comp_total,
                (SELECT COUNT(DISTINCT id_computador) FROM Computadores_persona WHERE activo = 'ACTIVO') AS comp_asig,
                (SELECT COUNT(*) FROM Celulares    WHERE activo = 'ACTIVO') AS cel_total,
                (SELECT COUNT(DISTINCT id_celular)  FROM Celulares_persona    WHERE activo = 'ACTIVO') AS cel_asig,
                (SELECT COUNT(*) FROM Radios        WHERE activo = 'ACTIVO') AS radio_total,
                (SELECT COUNT(DISTINCT id_radio)    FROM Radios_persona       WHERE activo = 'ACTIVO') AS radio_asig,
                (SELECT COUNT(*) FROM Tablets       WHERE activo = 'ACTIVO') AS tablet_total,
                (SELECT COUNT(DISTINCT id_tablet)   FROM Tablets_persona      WHERE activo = 'ACTIVO') AS tablet_asig,
                (SELECT COUNT(*) FROM Telefonos_ip  WHERE activo = 'ACTIVO') AS tel_total,
                (SELECT COUNT(DISTINCT id_telefono_ip) FROM Telefono_persona  WHERE activo = 'ACTIVO') AS tel_asig`),

            // 4. Personas activas por rol
            query(`SELECT rol, COUNT(*) AS cantidad
                   FROM Personas WHERE activo = true GROUP BY rol ORDER BY cantidad DESC`),

            // 5. Últimos 8 movimientos del historial
            query(`SELECT h.tipo_equipo, h.tipo_accion, h.fecha_accion,
                       p.nombre  AS persona,
                       u.Nombre_ubicacion AS ubicacion,
                       us.username AS usuario
                   FROM Historial_Equipos h
                   LEFT JOIN Personas         p  ON h.id_persona   = p.id_persona
                   LEFT JOIN Ubicaciones      u  ON h.id_ubicacion = u.id_ubicacion
                   LEFT JOIN Usuarios_sistema us ON h.id_usuario   = us.id_usuario
                   ORDER BY h.fecha_accion DESC
                   LIMIT 8`),

            // 6. Total personas
            query(`SELECT COUNT(*) AS total, SUM(activo) AS activas FROM Personas`),

            // 7. Últimos 10 equipos registrados (todos los tipos)
            query(`
                SELECT tipo, nombre, marca, modelo, fecha_creacion FROM (
                    SELECT 'Computador'  AS tipo,
                        COALESCE(nombre_equipo, codigo_activo, serial_equipo) AS nombre,
                        marca_equipo AS marca, modelo_equipo AS modelo, fecha_creacion
                    FROM Computadores WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT 'Celular',
                        COALESCE(nombre_celular, numero_celular, serial_celular),
                        marca, modelo, fecha_creacion
                    FROM Celulares WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT 'Impresora',
                        COALESCE(nombre_equipo, serial),
                        marca, modelo, fecha_creacion
                    FROM Impresoras WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT 'Radio',
                        COALESCE(tipo_radio, serial_radio),
                        marca, modelo, fecha_creacion
                    FROM Radios WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT 'Teléfono IP',
                        COALESCE(nombre_telefono, serial_telefono),
                        marca, modelo, fecha_creacion
                    FROM Telefonos_ip WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT 'Tablet',
                        COALESCE(nombre_tablet, serial_tablet),
                        marca, modelo, fecha_creacion
                    FROM Tablets WHERE activo = 'ACTIVO'
                    UNION ALL
                    SELECT 'Accesorio',
                        tipo_accesorio,
                        marca, modelo, fecha_creacion
                    FROM Accesorios WHERE activo = 'ACTIVO'
                ) AS todos
                ORDER BY fecha_creacion DESC
                LIMIT 10`),

            // 8. Top marcas por cantidad de equipos activos
            query(`
                SELECT marca, COUNT(*) AS total FROM (
                    SELECT marca_equipo AS marca FROM Computadores WHERE activo = 'ACTIVO' AND marca_equipo IS NOT NULL
                    UNION ALL
                    SELECT marca FROM Celulares    WHERE activo = 'ACTIVO' AND marca IS NOT NULL
                    UNION ALL
                    SELECT marca FROM Impresoras   WHERE activo = 'ACTIVO' AND marca IS NOT NULL
                    UNION ALL
                    SELECT marca FROM Radios        WHERE activo = 'ACTIVO' AND marca IS NOT NULL
                    UNION ALL
                    SELECT marca FROM Telefonos_ip  WHERE activo = 'ACTIVO' AND marca IS NOT NULL
                    UNION ALL
                    SELECT marca FROM Tablets       WHERE activo = 'ACTIVO' AND marca IS NOT NULL
                    UNION ALL
                    SELECT marca FROM Accesorios    WHERE activo = 'ACTIVO' AND marca IS NOT NULL
                ) AS todas
                WHERE TRIM(marca) != ''
                GROUP BY marca
                ORDER BY total DESC
                LIMIT 8`)
        ]);

        const s = statsRows[0];
        const total = DEVICE_KEYS.reduce((acc, k) => acc + Number(s[k] || 0), 0);

        res.json({
            success: true,
            data: {
                stats:          { ...s, total },
                porUbicacion:   ubicRows,
                asignacion:     asigRows[0],
                personasPorRol: rolesRows,
                historial:      histRows,
                personas:       personasRows[0],
                ultimosEquipos: ultimosRows,
                topMarcas:      marcasRows
            }
        });
    } catch (err) {
        console.error('Error en /api/dashboard:', err.message);
        res.status(500).json({ success: false, error: 'Error al obtener datos del dashboard' });
    }
});

// ✅ Cualquier ruta no-API devuelve el index.html (permite navegación directa)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../2_FRONTEND/index.html'));
    }
});

// 404 para rutas API no encontradas
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'Ruta API no encontrada', path: req.path });
    }
    next();
});

// Error global
app.use((err, req, res, next) => {
    console.error('Error global:', err.stack);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Error interno del servidor' });
});

// ── Inicio ───────────────────────────────────────────────────────────────────
async function startServer() {
    try {
        const connected = await testConnection();
        if (!connected) {
            console.error('No se pudo conectar a TiDB Cloud. Verifica el .env');
            process.exit(1);
        }
        app.listen(PORT, () => {
            console.log('\n═══════════════════════════════════════════════');
            console.log('  TICS AEROPUERTO - SERVIDOR INICIADO');
            console.log('═══════════════════════════════════════════════');
            console.log(`  App:          http://localhost:${PORT}`);
            console.log(`  Health:       http://localhost:${PORT}/api/health`);
            console.log(`  Frontend:     ../2_FRONTEND (estático)`);
            console.log('═══════════════════════════════════════════════\n');
        });
    } catch (error) {
        console.error('Error fatal:', error);
        process.exit(1);
    }
}

process.on('SIGINT',  () => { console.log('\nCerrando servidor...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\nCerrando servidor...'); process.exit(0); });

startServer();
module.exports = app;