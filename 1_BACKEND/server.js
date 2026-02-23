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