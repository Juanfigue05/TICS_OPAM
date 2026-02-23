// ============================================================================
// components.js — TICS Aeropuerto v3.1
// CORRECCIONES:
//   1. loadUserInfo() usa localStorage como fuente primaria (instantáneo)
//      y /auth/me como verificación secundaria.
//      Elimina el bug de rol_db (campo que no existe en la respuesta).
//   2. loadComponents() re-ejecuta los <script> inyectados vía innerHTML
//      (los navegadores no los ejecutan automáticamente).
//   3. Toast system actualizado con nuevas clases del CSS.
// ============================================================================

// ─── TOASTS ──────────────────────────────────────────────────────────────────

function showSuccess(msg) { _showToast(msg, 'toast-success', '✔'); }
function showError(msg)   { _showToast(msg, 'toast-error',   '✖'); }
function showWarning(msg) { _showToast(msg, 'toast-warning',  '⚠'); }

function _showToast(msg, type, icon) {
    // Crear contenedor si no existe
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-msg">${msg}</span>
        <span class="toast-close" onclick="this.closest('.toast').remove()">×</span>
    `;
    container.appendChild(toast);

    // Auto-eliminar en 4.5s con fade
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// ─── UTILIDADES ──────────────────────────────────────────────────────────────

function formatDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d) ? '—' : d.toLocaleDateString('es-CO');
}

function formatDateTime(date) {
    if (!date) return '—';
    const d = new Date(date);
    return isNaN(d) ? '—' : d.toLocaleString('es-CO');
}

// ─── AUTENTICACIÓN ───────────────────────────────────────────────────────────

window.logout = function () {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/index.html';
    }
};

// ─── CARGA DE INFO DE USUARIO ────────────────────────────────────────────────
//
// ESTRATEGIA DE 3 NIVELES:
//   1. localStorage.usuario  → Datos del login, disponibles AL INSTANTE
//      sin petición de red. Formato guardado por index.html después del login.
//   2. /auth/me              → Verifica y actualiza con datos frescos de la BD.
//   3. Decodificar JWT       → Fallback si falla la red pero existe el token.
//
// RESPUESTA REAL de /auth/me (auth.js):
//   { success: true, data: {
//       id_usuario, username, rol (=DB: ADMINISTRADOR/TICS/VISITANTE),
//       rol_jwt (=JWT: admin/technician/viewer),
//       id_persona, nombre, correo_asignado, cargo, area, celular,
//       ultimo_acceso
//   }}
//
// ─────────────────────────────────────────────────────────────────────────────

const ROL_LABELS = {
    admin:         'Administrador',
    ADMINISTRADOR: 'Administrador',
    technician:    'Técnico TICS',
    TICS:          'Técnico TICS',
    viewer:        'Visitante',
    VISITANTE:     'Visitante'
};

function _applyUserToNavbar(nombre, rolLabel) {
    const nameEl   = document.getElementById('navUserName');
    const roleEl   = document.getElementById('navUserRole');
    const avatarEl = document.getElementById('navAvatar');

    if (nameEl)   nameEl.textContent  = nombre   || '—';
    if (roleEl)   roleEl.textContent  = rolLabel  || '';
    if (avatarEl) avatarEl.textContent = (nombre || '?')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function _decodeJWT(token) {
    // Decodifica el payload del JWT sin verificar firma (solo para UI)
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload; // { id_usuario, username, rol, rol_db, id_persona }
    } catch (e) {
        return null;
    }
}

async function loadUserInfo() {
    const token = localStorage.getItem('token');

    // ── Nivel 1: localStorage.usuario (instantáneo) ──
    const stored = localStorage.getItem('usuario');
    if (stored) {
        try {
            const u = JSON.parse(stored);
            // El login guarda: { nombre, username, rol, rol_db, cargo, area, ... }
            const nombre   = u.nombre || u.username || '—';
            const rolLabel = ROL_LABELS[u.rol] || ROL_LABELS[u.rol_db] || u.rol_db || u.rol || '';
            _applyUserToNavbar(nombre, rolLabel);
        } catch (e) { /* JSON inválido */ }
    }

    // ── Nivel 2: /auth/me (verifica token y trae datos actualizados) ──
    if (!token) return;

    try {
        const res = await API.getMe();
        // res.data.rol = DB role (ADMINISTRADOR | TICS | VISITANTE)
        // res.data.rol_jwt = JWT role (admin | technician | viewer)
        if (res && res.success && res.data) {
            const d        = res.data;
            const nombre   = d.nombre || d.username || '—';
            const rolLabel = ROL_LABELS[d.rol_jwt] || ROL_LABELS[d.rol] || d.rol || '';
            _applyUserToNavbar(nombre, rolLabel);
            // Actualizar localStorage con datos frescos de la BD
            const prev = JSON.parse(localStorage.getItem('usuario') || '{}');
            localStorage.setItem('usuario', JSON.stringify({ ...prev, ...d }));
        }
    } catch (err) {
        // ── Nivel 3: Decodificar JWT como último recurso ──
        if (token) {
            const payload = _decodeJWT(token);
            if (payload) {
                const nombre   = payload.username || '—';
                const rolLabel = ROL_LABELS[payload.rol] || '';
                _applyUserToNavbar(nombre, rolLabel);
            }
        }
        // No redirigir aquí: puede ser error de red temporal
        console.warn('[TICS] loadUserInfo - error al verificar sesión:', err.message);
    }
}

// ─── CARGADOR DE COMPONENTES HTML ────────────────────────────────────────────
//
// FIX CRÍTICO: Los navegadores NO ejecutan <script> insertados vía innerHTML.
// La función _executeScripts() clona cada <script> y lo reemplaza en el DOM,
// lo que fuerza al navegador a ejecutarlo.
// ─────────────────────────────────────────────────────────────────────────────

function _executeScripts(container) {
    container.querySelectorAll('script').forEach(oldScript => {
        const newScript = document.createElement('script');
        // Copiar atributos (type, src, etc.)
        Array.from(oldScript.attributes).forEach(attr =>
            newScript.setAttribute(attr.name, attr.value)
        );
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
    });
}

async function loadComponents(activePage = '') {
    // Determinar página activa para resaltar enlace en sidebar
    const currentPath = activePage || window.location.pathname;

    try {
        // Cargar los tres componentes en paralelo
        const [navbarHtml, sidebarHtml, footerHtml] = await Promise.all([
            fetch('/components/navbar.html').then(r => {
                if (!r.ok) throw new Error(`navbar.html → HTTP ${r.status}`);
                return r.text();
            }),
            fetch('/components/sidebar.html').then(r => {
                if (!r.ok) throw new Error(`sidebar.html → HTTP ${r.status}`);
                return r.text();
            }),
            fetch('/components/footer.html').then(r => {
                if (!r.ok) throw new Error(`footer.html → HTTP ${r.status}`);
                return r.text();
            })
        ]);

        // Inyectar HTML
        const navbarEl  = document.getElementById('navbar-placeholder');
        const sidebarEl = document.getElementById('sidebar-placeholder');
        const footerEl  = document.getElementById('footer-placeholder');

        if (navbarEl)  { navbarEl.innerHTML  = navbarHtml;  _executeScripts(navbarEl);  }
        if (sidebarEl) { sidebarEl.innerHTML = sidebarHtml; _executeScripts(sidebarEl); }
        if (footerEl)  { footerEl.innerHTML  = footerHtml;  _executeScripts(footerEl);  }

        // Marcar enlace activo en sidebar
        document.querySelectorAll('.nav-link[data-page]').forEach(link => {
            const page = link.getAttribute('data-page');
            if (page && currentPath.includes(page)) {
                link.classList.add('active');
            }
        });

        // Cargar info del usuario en el navbar ya insertado
        // (se llama tanto desde aquí como desde el propio navbar.html
        //  gracias a _executeScripts — sin duplicar, solo el segundo
        //  call sobreescribe con datos más frescos)
        await loadUserInfo();

    } catch (err) {
        console.error('[TICS] loadComponents error:', err.message);
    }
}

// ─── GUARDS DE AUTENTICACIÓN ─────────────────────────────────────────────────

function requireAuth() {
    if (!localStorage.getItem('token')) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// ─── INICIALIZACIÓN ──────────────────────────────────────────────────────────

// En páginas de login no hacer nada
const _isPublicPage = ['/', '/index.html', '/login.html']
    .some(p => window.location.pathname.endsWith(p.replace('/', '')));

if (!_isPublicPage) {
    // Verificar autenticación básica
    if (!localStorage.getItem('token')) {
        window.location.href = '/index.html';
    }
}