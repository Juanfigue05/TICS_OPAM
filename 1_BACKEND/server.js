// ============================================================================
// ARCHIVO: 1_backend/server.js
// DESCRIPCIÓN: Servidor Express principal con todas las rutas activas.
//
// CÓMO EJECUTAR (desde la RAÍZ del proyecto):
//   npm run dev    → nodemon 1_backend/server.js
//   npm start      → node 1_backend/server.js
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');

// ============================================================================
// IMPORTAR TODAS LAS RUTAS
// ============================================================================
const authRoutes       = require('./routes/auth');
const personaRoutes    = require('./routes/persona');
const computadorRoutes = require('./routes/computador');
const celularRoutes    = require('./routes/celular');
const impresoraRoutes  = require('./routes/impresora');
const radioRoutes      = require('./routes/radio');
const telefonoIPRoutes = require('./routes/telefono_ip');
const tabletRoutes     = require('./routes/tablet');
const accesorioRoutes  = require('./routes/accesorios');
const ubicacionRoutes  = require('./routes/ubicacion');
const historialRoutes  = require('./routes/historial');
const bodegaRoutes     = require('./routes/bodega');

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// ============================================================================
// RUTAS ESPECIALES (sin autenticación)
// ============================================================================

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'TICS Aeropuerto API funcionando',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/stats', async (req, res) => {
    try {
        const { query } = require('./config/database');
        const [comp, cel, imp, rad, tel, tab, acc, per] = await Promise.all([
            query("SELECT COUNT(*) as c FROM Computadores WHERE activo = 'ACTIVO'"),
            query("SELECT COUNT(*) as c FROM Celulares WHERE activo = 'ACTIVO'"),
            query("SELECT COUNT(*) as c FROM Impresoras WHERE activo = 'ACTIVO'"),
            query("SELECT COUNT(*) as c FROM Radios WHERE activo = 'ACTIVO'"),
            query("SELECT COUNT(*) as c FROM Telefonos_ip WHERE activo = 'ACTIVO'"),
            query("SELECT COUNT(*) as c FROM Tablets WHERE activo = 'ACTIVO'"),
            query("SELECT COUNT(*) as c FROM Accesorios WHERE activo = 'ACTIVO'"),
            query("SELECT COUNT(*) as c FROM Personas WHERE activo = true")
        ]);
        const data = {
            computadores: comp[0].c, celulares: cel[0].c, impresoras: imp[0].c,
            radios: rad[0].c, telefonos_ip: tel[0].c, tablets: tab[0].c,
            accesorios: acc[0].c, personas: per[0].c
        };
        data.total = Object.values(data).reduce((a, b) => a + b, 0);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }
});

// ============================================================================
// TODAS LAS RUTAS API
// ============================================================================
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

// ============================================================================
// FRONTEND ESTÁTICO
// ============================================================================
app.use(express.static(path.join(__dirname, '../2_FRONTEND')));
app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../2_FRONTEND/index.html'));
    } else {
        res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
    }
});

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================
app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ success: false, error: 'Ruta no encontrada', path: req.path });
    }
});
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({ success: false, error: err.message || 'Error interno del servidor' });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================
async function startServer() {
    try {
        const dbOk = await testConnection();
        if (!dbOk) {
            console.error('❌ No se pudo conectar a MySQL. Verifica el archivo .env');
            process.exit(1);
        }
        app.listen(PORT, () => {
            console.log('\n═══════════════════════════════════════════');
            console.log('🚀 TICS AEROPUERTO - SERVIDOR INICIADO');
            console.log('═══════════════════════════════════════════');
            console.log(`🌐 App:    http://localhost:${PORT}`);
            console.log(`🔧 API:    http://localhost:${PORT}/api`);
            console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
            console.log(`📊 Stats:  http://localhost:${PORT}/api/stats`);
            console.log('═══════════════════════════════════════════');
            console.log('✅ RUTAS ACTIVAS (12 módulos):');
            console.log('   /api/auth         /api/personas');
            console.log('   /api/computadores /api/celulares');
            console.log('   /api/impresoras   /api/radios');
            console.log('   /api/telefonos-ip /api/tablets');
            console.log('   /api/accesorios   /api/ubicaciones');
            console.log('   /api/historial    /api/bodega');
            console.log('═══════════════════════════════════════════\n');
        });
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

process.on('SIGINT',  () => { console.log('\n🛑 Cerrando servidor...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n🛑 Cerrando servidor...'); process.exit(0); });

startServer();
module.exports = app;