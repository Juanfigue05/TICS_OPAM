// ============================================================================
// ARCHIVO: 2_FRONTEND/assets/js/components.js
// DESCRIPCIÓN: Funciones reutilizables de UI + cargador de componentes HTML
//              + toggle de modo oscuro
//
// FUNCIONES GLOBALES DISPONIBLES:
//   showSuccess(msg)              → Toast verde de éxito (5 seg, auto-cierra)
//   showError(msg)                → Toast rojo de error  (5 seg, auto-cierra)
//   confirmAction(msg)            → Confirm nativo del navegador
//   formatDate(date)              → Fecha en locale es-CO  "dd/mm/aaaa"
//   formatDateTime(date)          → Fecha + hora en locale es-CO
//   getStatusBadge(estado)        → HTML del badge según el estado del equipo
//   createTableRow(data, cols, actions) → <tr> construido dinámicamente
//   logout()                      → Cierra sesión con confirmación
//   loadUserInfo()                → Pone el nombre del usuario en .user-name,
//                                   #userInfo, #navUserName, #navAvatar, #navUserRole
//   loadComponents(activePage)    → Carga navbar/sidebar/footer desde /components/
//   toggleDarkMode()              → Alterna entre modo claro y oscuro
//   initTheme()                   → Lee la preferencia guardada y la aplica
// ============================================================================


// ─── TOASTS ──────────────────────────────────────────────────────────────────

/**
 * Muestra un toast de éxito en la esquina superior derecha (5 segundos).
 * @param {string} message
 */
function showSuccess(message) {
    _showToast(message, 'success', '✔ Éxito');
}

/**
 * Muestra un toast de error en la esquina superior derecha (5 segundos).
 * @param {string} message
 */
function showError(message) {
    _showToast(message, 'error', '✖ Error');
}

function _showToast(message, type, prefix) {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} animate-fade-in`;
    toast.innerHTML = `
        <strong>${prefix}:</strong> ${message}
        <button
            onclick="this.parentElement.remove()"
            style="float:right; border:none; background:transparent; cursor:pointer; font-size:1.25rem; line-height:1; margin-left:1rem; color:inherit;"
        >×</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
}


// ─── UTILIDADES GENERALES ────────────────────────────────────────────────────

/**
 * Confirm nativo del navegador.
 * @param {string} message
 * @returns {boolean}
 */
function confirmAction(message) {
    return confirm(message);
}

/**
 * Formatea una fecha en locale es-CO (dd/mm/aaaa).
 * @param {string|Date} date
 * @returns {string}
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('es-CO');
}

/**
 * Formatea fecha y hora en locale es-CO.
 * @param {string|Date} date
 * @returns {string}
 */
function formatDateTime(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('es-CO');
}

/**
 * Devuelve el HTML del badge de estado según el valor del campo `estado`.
 * Compatible con los valores del ENUM del schema:
 *   Activo | Mantenimiento | Dado de baja | Almacén | En Bodega
 * @param {string} estado
 * @returns {string}  HTML listo para innerHTML
 */
function getStatusBadge(estado) {
    const map = {
        'Activo':        '<span class="status-indicator on-time">En Servicio</span>',
        'Mantenimiento': '<span class="status-indicator delayed">Mantenimiento</span>',
        'Dado de baja':  '<span class="status-indicator cancelled">Fuera de Servicio</span>',
        'Almacén':       '<span class="badge badge-secondary">En Almacén</span>',
        'En Bodega':     '<span class="badge badge-secondary">En Bodega</span>',
    };
    return map[estado] || `<span class="badge badge-secondary">${estado || 'N/A'}</span>`;
}

/**
 * Construye un elemento <tr> de tabla de forma dinámica.
 * @param {Object}   data    – Objeto de datos de la fila
 * @param {Array}    columns – [{ field, render }]  render(data) → string HTML
 * @param {Function} actions – actions(data) → string HTML de botones
 * @returns {HTMLTableRowElement}
 */
function createTableRow(data, columns, actions) {
    const tr = document.createElement('tr');

    columns.forEach(col => {
        const td = document.createElement('td');
        if (col.render) {
            td.innerHTML = col.render(data);
        } else {
            td.textContent = data[col.field] ?? 'N/A';
        }
        tr.appendChild(td);
    });

    if (actions) {
        const td = document.createElement('td');
        td.innerHTML = actions(data);
        tr.appendChild(td);
    }

    return tr;
}


// ─── AUTENTICACIÓN ───────────────────────────────────────────────────────────

/**
 * Cierra la sesión del usuario con confirmación previa.
 */
function logout() {
    if (confirmAction('¿Estás seguro de cerrar sesión?')) {
        API.logout();
    }
}


// ─── INFO DE USUARIO ─────────────────────────────────────────────────────────

/**
 * Carga el nombre y rol del usuario autenticado.
 * Actualiza los siguientes elementos si existen en el DOM:
 *   .user-name, #userInfo → nombre completo
 *   #navUserName          → nombre (navbar componente)
 *   #navUserRole          → rol legible (navbar componente)
 *   #navAvatar            → inicial del nombre (navbar componente)
 */
async function loadUserInfo() {
    try {
        const response = await API.getMe();
        if (!response || !response.success) return;

        const { nombre, rol, rol_db } = response.data;

        // Nombre en elementos genéricos
        ['.user-name', '#userInfo'].forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.textContent = nombre || '—';
            });
        });

        // Navbar componente
        const navName = document.getElementById('navUserName');
        if (navName) navName.textContent = nombre || '—';

        const rolLabel = {
            admin:       'Administrador',
            technician:  'Técnico TICS',
            viewer:      'Visitante',
            ADMINISTRADOR: 'Administrador',
            TICS:          'Técnico TICS',
            VISITANTE:     'Visitante',
        };
        const navRole = document.getElementById('navUserRole');
        if (navRole) navRole.textContent = rolLabel[rol] || rolLabel[rol_db] || rol_db || '';

        const avatar = document.getElementById('navAvatar');
        if (avatar) avatar.textContent = (nombre || '?').charAt(0).toUpperCase();

    } catch (error) {
        console.warn('loadUserInfo:', error.message);
    }
}


// ─── CARGADOR DE COMPONENTES HTML ────────────────────────────────────────────

/**
 * Carga un fragmento HTML externo e inyecta su contenido en el elemento destino.
 * @param {string} selector  – CSS selector del <div> contenedor
 * @param {string} url       – Ruta del archivo HTML fragmento
 * @returns {Promise<boolean>}
 */
async function includeHTML(selector, url) {
    const container = document.querySelector(selector);
    if (!container) return false;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        container.innerHTML = await res.text();
        return true;
    } catch (e) {
        console.warn(`No se pudo cargar componente [${url}]:`, e.message);
        return false;
    }
}

/**
 * Carga los tres componentes (navbar, sidebar, footer) y marca el link activo.
 *
 * REQUISITOS en el HTML de la página:
 *   <div id="navbar-placeholder"></div>    — dentro de .airport-layout, antes del <aside>
 *   <div id="sidebar-placeholder"></div>   — donde va el <aside>
 *   <div id="footer-placeholder"></div>    — al final del .airport-layout
 *
 * LLAMADA en el script de la página:
 *   loadComponents('/pages/miPagina.html');
 *   // o sin argumento: detecta automáticamente
 *
 * @param {string} [activePage]  – Ruta de la página actual p.ej '/pages/celular.html'
 */
async function loadComponents(activePage) {
    const currentPage = activePage || window.location.pathname;

    // Cargar los tres fragmentos en paralelo
    await Promise.all([
        includeHTML('#navbar-placeholder',  '/components/navbar.html'),
        includeHTML('#sidebar-placeholder', '/components/sidebar.html'),
        includeHTML('#footer-placeholder',  '/components/footer.html'),
    ]);

    // Marcar el enlace activo en el sidebar
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === currentPage) {
            link.classList.add('active');
        }
    });

    // Cargar info del usuario en el navbar cargado
    loadUserInfo();

    // Actualizar el ícono del botón de modo oscuro si existe
    _updateThemeToggleIcon();
}


// ─── MODO OSCURO ─────────────────────────────────────────────────────────────

/**
 * Aplica el tema guardado al arrancar la página.
 * Lee localStorage key 'tics-theme': 'dark' | 'light'
 * Si no hay preferencia guardada, respeta prefers-color-scheme.
 * Llamar en <head> o al inicio del <body> para evitar flash.
 */
function initTheme() {
    const saved = localStorage.getItem('tics-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Alterna entre modo claro y modo oscuro.
 * Guarda la preferencia en localStorage.
 */
function toggleDarkMode() {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('tics-theme', next);
    _updateThemeToggleIcon();
}

/**
 * Actualiza el ícono / texto del botón de toggle de tema
 * si existe un elemento con id="themeToggleBtn".
 */
function _updateThemeToggleIcon() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = isDark ? '☀️ Modo claro' : '🌙 Modo oscuro';
    btn.title       = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
}


// ─── INICIALIZACIÓN AUTOMÁTICA ───────────────────────────────────────────────

// Aplicar tema guardado antes del primer render
initTheme();

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    // No tocar nada en las páginas públicas (login)
    const isPublic = path === '/'
                  || path.endsWith('index.html')
                  || path.endsWith('login.html');
    if (isPublic) {
        // Solo aplicar tema en login también
        _updateThemeToggleIcon();
        return;
    }

    // Si la página tiene placeholders de componentes, loadComponents()
    // debe llamarse manualmente en el script de la página.
    // Si no los tiene (nav inline), cargamos solo el nombre del usuario.
    const usesPlaceholders = !!document.querySelector('#navbar-placeholder');
    if (!usesPlaceholders) {
        loadUserInfo();
    }

    // Sincronizar ícono del toggle si ya está en el DOM
    _updateThemeToggleIcon();
});