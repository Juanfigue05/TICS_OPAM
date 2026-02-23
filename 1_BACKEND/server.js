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
const QRCode = require('qrcode');

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

// ============================================================================
// RUTAS PÚBLICAS — No requieren autenticación
// ============================================================================

// Mapa de tipos de dispositivo → configuración de consulta
const PUBLIC_DEVICE_MAP = {
    computador: {
        table: 'Computadores', pk: 'id_computador',
        sql: `SELECT c.id_computador AS id, 'Computador' AS tipo_equipo,
                c.codigo_activo, c.nombre_equipo AS nombre,
                c.marca_equipo AS marca, c.modelo_equipo AS modelo,
                c.serial_equipo AS serial, c.estado, c.activo,
                c.qr_code,
                -- Campos técnicos (solo para usuarios autenticados, se filtran en frontend)
                c.procesador, c.capacidad_ram, c.capacidad_disco, c.tipo_disco,
                c.sistema_operativo, c.tipo_computador,
                c.mac_wifi, c.mac_ethernet, c.direccion_ip,
                c.fecha_adquisicion, c.fecha_garantia, c.ultimo_mantenimiento, c.notas,
                -- Asignación
                p.nombre AS asignado_a, p.cargo, p.area AS area_persona,
                u.Nombre_ubicacion AS ubicacion, u.Area AS area_ubicacion
              FROM Computadores c
              LEFT JOIN Computadores_persona cp ON c.id_computador = cp.id_computador AND cp.activo = 'ACTIVO'
              LEFT JOIN Personas p ON cp.id_persona = p.id_persona
              LEFT JOIN Ubicaciones u ON cp.id_ubicacion = u.id_ubicacion
              WHERE c.id_computador = ?`
    },
    celular: {
        table: 'Celulares', pk: 'id_celular',
        sql: `SELECT c.id_celular AS id, 'Celular' AS tipo_equipo,
                NULL AS codigo_activo, c.nombre_celular AS nombre,
                c.marca, c.modelo, c.serial_celular AS serial,
                c.estado, c.activo, c.qr_code,
                c.numero_celular, c.imei1_celular, c.imei2_celular,
                c.sim_company, c.sistema_op, c.version_op,
                c.ram, c.almacenamiento, c.procesador,
                c.plan_datos, c.fecha_adquisicion, c.notas,
                p.nombre AS asignado_a, p.cargo,
                u.Nombre_ubicacion AS ubicacion, u.Area AS area_ubicacion
              FROM Celulares c
              LEFT JOIN Celulares_persona cp ON c.id_celular = cp.id_celular AND cp.activo = 'ACTIVO'
              LEFT JOIN Personas p ON cp.id_persona = p.id_persona
              LEFT JOIN Ubicaciones u ON cp.id_ubicacion = u.id_ubicacion
              WHERE c.id_celular = ?`
    },
    impresora: {
        table: 'Impresoras', pk: 'id_impresora',
        sql: `SELECT i.id_impresora AS id, 'Impresora' AS tipo_equipo,
                NULL AS codigo_activo, i.nombre_equipo AS nombre,
                i.marca, i.modelo, i.serial,
                i.estado, i.activo, i.qr_code,
                i.tipo_impresora, i.tipo_red, i.ip_impresora,
                i.mac_ethernet, i.mac_wifi,
                i.impresion_color, i.tiene_escaner, i.impresion_duplex,
                i.fecha_adquisicion, i.ultimo_mantenimiento, i.notas,
                NULL AS asignado_a, NULL AS cargo,
                u.Nombre_ubicacion AS ubicacion, u.Area AS area_ubicacion
              FROM Impresoras i
              LEFT JOIN Impresoras_ubicacion iu ON i.id_impresora = iu.id_impresora AND iu.activo = 'ACTIVO'
              LEFT JOIN Ubicaciones u ON iu.id_ubicacion = u.id_ubicacion
              WHERE i.id_impresora = ?`
    },
    radio: {
        table: 'Radios', pk: 'id_radio',
        sql: `SELECT r.id_radio AS id, 'Radio' AS tipo_equipo,
                NULL AS codigo_activo, r.tipo_radio AS nombre,
                r.marca, r.modelo, r.serial_radio AS serial,
                r.estado, r.activo, r.qr_code,
                r.frecuencia, r.bateria, r.serial_bateria,
                r.antena, r.diadema_manos_libres, r.base_cargador,
                r.fecha_adquisicion, r.notas,
                p.nombre AS asignado_a, p.cargo,
                u.Nombre_ubicacion AS ubicacion, u.Area AS area_ubicacion
              FROM Radios r
              LEFT JOIN Radios_persona rp ON r.id_radio = rp.id_radio AND rp.activo = 'ACTIVO'
              LEFT JOIN Personas p ON rp.id_persona = p.id_persona
              LEFT JOIN Ubicaciones u ON rp.id_ubicacion = u.id_ubicacion
              WHERE r.id_radio = ?`
    },
    telefono_ip: {
        table: 'Telefonos_ip', pk: 'id_telefono_ip',
        sql: `SELECT t.id_telefono_ip AS id, 'Teléfono IP' AS tipo_equipo,
                NULL AS codigo_activo, t.nombre_telefono AS nombre,
                t.marca, t.modelo, t.serial_telefono AS serial,
                t.estado, t.activo, t.qr_code,
                t.extension, t.protocolo, t.ip_telefono,
                t.mac_address, t.poe, t.tiene_pantalla, t.cantidad_lineas,
                t.fecha_adquisicion, t.notas,
                p.nombre AS asignado_a, p.cargo,
                u.Nombre_ubicacion AS ubicacion, u.Area AS area_ubicacion
              FROM Telefonos_ip t
              LEFT JOIN Telefono_persona tp ON t.id_telefono_ip = tp.id_telefono_ip AND tp.activo = 'ACTIVO'
              LEFT JOIN Personas p ON tp.id_persona = p.id_persona
              LEFT JOIN Ubicaciones u ON tp.id_ubicacion = u.id_ubicacion
              WHERE t.id_telefono_ip = ?`
    },
    tablet: {
        table: 'Tablets', pk: 'id_tablet',
        sql: `SELECT ta.id_tablet AS id, 'Tablet' AS tipo_equipo,
                NULL AS codigo_activo, ta.nombre_tablet AS nombre,
                ta.marca, ta.modelo, ta.serial_tablet AS serial,
                ta.estado, ta.activo, ta.qr_code,
                ta.imei, ta.sistema_op, ta.version_op,
                ta.ram, ta.almacenamiento, ta.procesador,
                ta.tamano_pantalla, ta.sim_company, ta.plan_datos,
                ta.fecha_adquisicion, ta.notas,
                p.nombre AS asignado_a, p.cargo,
                u.Nombre_ubicacion AS ubicacion, u.Area AS area_ubicacion
              FROM Tablets ta
              LEFT JOIN Tablets_persona tp ON ta.id_tablet = tp.id_tablet AND tp.activo = 'ACTIVO'
              LEFT JOIN Personas p ON tp.id_persona = p.id_persona
              LEFT JOIN Ubicaciones u ON tp.id_ubicacion = u.id_ubicacion
              WHERE ta.id_tablet = ?`
    },
    accesorio: {
        table: 'Accesorios', pk: 'id_accesorio',
        sql: `SELECT a.id_accesorio AS id, 'Accesorio' AS tipo_equipo,
                NULL AS codigo_activo, a.tipo_accesorio AS nombre,
                a.marca, a.modelo, a.serial,
                a.estado, a.activo, a.qr_code,
                a.descripcion, a.cantidad,
                a.fecha_adquisicion, a.notas,
                p.nombre AS asignado_a, p.cargo,
                u.Nombre_ubicacion AS ubicacion, u.Area AS area_ubicacion
              FROM Accesorios a
              LEFT JOIN Accesorios_persona ap ON a.id_accesorio = ap.id_accesorio AND ap.activo = 'ACTIVO'
              LEFT JOIN Personas p ON ap.id_persona = p.id_persona
              LEFT JOIN Ubicaciones u ON ap.id_ubicacion = u.id_ubicacion
              WHERE a.id_accesorio = ?`
    }
};

// ── GET /api/public/dispositivo/:tipo/:id — Sin autenticación ────────────────
app.get('/api/public/dispositivo/:tipo/:id', async (req, res) => {
    const { tipo, id } = req.params;
    const cfg = PUBLIC_DEVICE_MAP[tipo];
    if (!cfg) return res.status(400).json({ success: false, error: 'Tipo de dispositivo inválido' });
    try {
        const rows = await query(cfg.sql, [id]);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Dispositivo no encontrado' });
        res.json({ success: true, tipo, data: rows[0] });
    } catch (err) {
        console.error('Error en public/dispositivo:', err.message);
        res.status(500).json({ success: false, error: 'Error al obtener el dispositivo' });
    }
});

// ── GET /api/public/qr — Genera SVG del QR (sin auth) ───────────────────────
app.get('/api/public/qr', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, error: 'Parámetro url requerido' });
    try {
        const svg = await QRCode.toString(decodeURIComponent(url), {
            type:   'svg',
            margin: 2,
            width:  260,
            color:  { dark: '#000000', light: '#ffffff' }
        });
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h (el QR es estático)
        res.send(svg);
    } catch (err) {
        console.error('Error generando QR:', err.message);
        res.status(500).json({ success: false, error: 'Error al generar el código QR' });
    }
});

// ── POST /api/dispositivos/:tipo/:id/guardar-qr — Guarda QR en BD ────────────
app.post('/api/dispositivos/:tipo/:id/guardar-qr',
    authenticateToken,
    (req, res, next) => {
        const roles = ['technician', 'admin'];
        if (!roles.includes(req.user.rol))
            return res.status(403).json({ success: false, error: 'Sin permisos para guardar QR' });
        next();
    },
    async (req, res) => {
        const { tipo, id } = req.params;
        const { qr_svg } = req.body;
        if (!qr_svg) return res.status(400).json({ success: false, error: 'qr_svg requerido' });

        const cfg = PUBLIC_DEVICE_MAP[tipo];
        if (!cfg) return res.status(400).json({ success: false, error: 'Tipo inválido' });

        try {
            await query(`UPDATE ${cfg.table} SET qr_code = ? WHERE ${cfg.pk} = ?`, [qr_svg, id]);
            res.json({ success: true, message: 'Código QR guardado en la base de datos' });
        } catch (err) {
            console.error('Error guardando QR:', err.message);
            res.status(500).json({ success: false, error: 'Error al guardar el QR' });
        }
    }
);

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